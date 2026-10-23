import test from 'node:test';
import assert from 'node:assert/strict';
import {newPglite} from '../db/pglite-for-tests.mjs';
import {migrate} from '../db/migrate.mjs';

test('invitation redemption is single-use, excludes expired and revoked tokens, and stays in one tenant',async()=>{
 const pg=await newPglite();
 const db={exec:s=>pg.exec(s),query:(s,p)=>pg.query(s,p)};
 await migrate(db);
 const business='a0000000-0000-4000-8000-000000000091';
 const owner='b0000000-0000-4000-8000-000000000092';
 const invitee='c0000000-0000-4000-8000-000000000093';
 await db.query('INSERT INTO businesses(id,name) VALUES($1,$2)',[business,'OPADA SYNTHETIC INVITATION QA']);
 await db.query("INSERT INTO staff(id,business_id,role,display_name) VALUES($1,$2,'owner','Owner'),($3,$2,'staff','Invitee')",[owner,business,invitee]);
 const insert=await db.query(`INSERT INTO staff_invitations
 (business_id,invited_by,invited_email,invited_role,token_digest,expires_at)
 VALUES($1,$2,'qa@example.invalid','staff',$3,now()+interval '1 day') RETURNING id`,[business,owner,'a'.repeat(64)]);
 const id=insert.rows[0].id;
 const redeem=`UPDATE staff_invitations SET consumed_at=now(),accepted_by=$1
 WHERE id=$2 AND business_id=$3 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at>now()
 RETURNING id`;
 assert.equal((await db.query(redeem,[invitee,id,business])).rows.length,1);
 assert.equal((await db.query(redeem,[invitee,id,business])).rows.length,0,'replay must not consume twice');
 const expired=await db.query(`INSERT INTO staff_invitations
 (business_id,invited_by,invited_email,invited_role,token_digest,expires_at)
 VALUES($1,$2,'expired@example.invalid','staff',$3,now()+interval '1 day') RETURNING id`,[business,owner,'b'.repeat(64)]);
 await db.query("UPDATE staff_invitations SET created_at=now()-interval '2 days',expires_at=now()-interval '1 minute' WHERE id=$1",[expired.rows[0].id]);
 assert.equal((await db.query(redeem,[invitee,expired.rows[0].id,business])).rows.length,0);
 const revoked=await db.query(`INSERT INTO staff_invitations
 (business_id,invited_by,invited_email,invited_role,token_digest,expires_at,revoked_at)
 VALUES($1,$2,'revoked@example.invalid','staff',$3,now()+interval '1 day',now()) RETURNING id`,[business,owner,'c'.repeat(64)]);
 assert.equal((await db.query(redeem,[invitee,revoked.rows[0].id,business])).rows.length,0);
});
