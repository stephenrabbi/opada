// Transaction-scoped synthetic security checks. Never use a production database URL.
// The script ALWAYS rolls back, including on assertions or connection errors.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';

const url=process.env.OPADA_STAGING_DATABASE_URL;
if(!url||process.env.OPADA_STAGING_TEST_ALLOWED!=='opada-release-staging-20261023')
 throw Error('Explicit staging URL and exact staging opt-in required.');
const parsed=new URL(url);
if(!parsed.hostname.endsWith('.neon.tech')||!process.env.OPADA_STAGING_ENDPOINT_HOST||parsed.hostname!==process.env.OPADA_STAGING_ENDPOINT_HOST)
 throw Error('Refusing to run: staging database hostname must match the independently verified staging endpoint.');
const client=new pg.Client({connectionString:url,ssl:{rejectUnauthorized:true}});
await client.connect();
let began=false;
try{
 await client.query('BEGIN');
 began=true;
 await client.query("SET LOCAL statement_timeout='15s'");
 const businessA=randomUUID(),businessB=randomUUID(),member=randomUUID();
 await client.query('INSERT INTO businesses(id,name) VALUES($1,$2),($3,$4)',[businessA,'OPADA SYNTHETIC ROLLBACK HOTEL',businessB,'OPADA SYNTHETIC ROLLBACK CAFE']);
 await client.query('INSERT INTO staff(id,business_id,role,display_name,auth_subject) VALUES($1,$2,$3,$4,$5)',[member,businessA,'owner','Synthetic owner','rollback-'+randomUUID()]);
 await client.query('SAVEPOINT denied_session');
 let sessionDenied=false;
 try{
   await client.query("INSERT INTO staff_sessions(staff_id,business_id,token_digest,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",[member,businessB,'a'.repeat(64)]);
 }catch(e){sessionDenied=e.code==='23503'}
 await client.query('ROLLBACK TO SAVEPOINT denied_session');
 assert.ok(sessionDenied,'Cross-business session must be rejected');
 await client.query("INSERT INTO staff_sessions(staff_id,business_id,token_digest,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",[member,businessA,'b'.repeat(64)]);
 await client.query("UPDATE staff_sessions SET revoked_at=now() WHERE token_digest=$1",['b'.repeat(64)]);
 const live=await client.query("SELECT count(*)::int AS n FROM staff_sessions WHERE token_digest=$1 AND revoked_at IS NULL",['b'.repeat(64)]);
 assert.equal(live.rows[0].n,0);
 await client.query('SAVEPOINT denied_invite');
 let inviteDenied=false;
 try{
   await client.query("INSERT INTO staff_invitations(business_id,invited_by,invited_email,invited_role,token_digest,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '1 day')",[businessB,member,'synthetic@example.invalid','staff','c'.repeat(64)]);
 }catch(e){inviteDenied=e.code==='23503'}
 await client.query('ROLLBACK TO SAVEPOINT denied_invite');
 assert.ok(inviteDenied,'Cross-business inviter must be rejected');
 await client.query("INSERT INTO staff_invitations(business_id,invited_by,invited_email,invited_role,token_digest,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '1 day')",[businessA,member,'synthetic@example.invalid','staff','d'.repeat(64)]);
 const count=await client.query("SELECT count(*)::int AS n FROM staff_invitations WHERE token_digest=$1",['d'.repeat(64)]);
 assert.equal(count.rows[0].n,1);
 console.log('Synthetic tenant sessions, revocation, invitations and isolation checks passed; rolling back.');
}finally{
 if(began)await client.query('ROLLBACK').catch(()=>{});
 await client.end();
}
