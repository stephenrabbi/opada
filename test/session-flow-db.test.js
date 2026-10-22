import test from 'node:test';
import assert from 'node:assert/strict';
import {newPglite} from '../db/pglite-for-tests.mjs';
import {migrate} from '../db/migrate.mjs';
import {beginVerifiedStaffSession} from '../src/login-flow.js';
import {findActiveStaffSession,revokeStaffSession} from '../src/session-store.js';
import {sessionDigest} from '../src/session-policy.js';

test('verified login resolves exact hospitality tenant and logout revokes access',async()=>{
 const pg=await newPglite();
 await migrate({exec:s=>pg.exec(s),query:(s,p)=>pg.query(s,p)});
 const hotel='a0000000-0000-4000-8000-000000000001';
 const cafe='b0000000-0000-4000-8000-000000000002';
 const owner='c0000000-0000-4000-8000-000000000003';
 await pg.query('INSERT INTO businesses(id,name) VALUES($1,$2),($3,$4)',[hotel,'OPADA SYNTHETIC HOTEL',cafe,'OPADA SYNTHETIC CAFE']);
 await pg.query("INSERT INTO staff(id,business_id,role,display_name,active,auth_subject) VALUES($1,$2,'owner','Hotel Owner',true,'verified-owner')",[owner,hotel]);
 const sql=async(parts,...params)=>{
  const query=parts.reduce((s,p,i)=>s+p+(i<params.length?'$'+(i+1):''),'');
  return (await pg.query(query,params)).rows;
 };
 const token='synthetic-test-token';
 const verify=async received=>received===token?{subject:'verified-owner',emailVerified:true,email:'owner@example.test'}:null;
 assert.equal(await beginVerifiedStaffSession({sql,identityToken:'not-verified',verify}),null);
 const session=await beginVerifiedStaffSession({sql,identityToken:token,verify});
 assert.equal(session.staff.role,'owner');
 const digest=sessionDigest(session.secret);
 assert.equal((await pg.query('SELECT token_digest FROM staff_sessions')).rows[0].token_digest,digest);
 const resolved=await findActiveStaffSession({sql,secret:session.secret});
 assert.equal(resolved.business_id,hotel);
 assert.notEqual(resolved.business_id,cafe);
 assert.equal(await revokeStaffSession({sql,secret:session.secret}),true);
 assert.equal(await findActiveStaffSession({sql,secret:session.secret}),null);
 assert.equal(await revokeStaffSession({sql,secret:session.secret}),false);
});
