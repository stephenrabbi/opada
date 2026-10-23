import test from 'node:test';
import assert from 'node:assert/strict';
import {newPglite} from '../db/pglite-for-tests.mjs';
import {migrate} from '../db/migrate.mjs';
import {prepareStaffInvitation} from '../src/prepare-staff-invitation.js';
import {redeemExistingStaffInvitation} from '../src/redeem-staff-invitation.js';

test('verified invitation is single-use, email-bound and tenant-bound',async()=>{
 const pg=await newPglite();
 await migrate({exec:s=>pg.exec(s),query:(s,p)=>pg.query(s,p)});
 const a='a0000000-0000-4000-8000-000000000011';
 const b='b0000000-0000-4000-8000-000000000022';
 const owner='c0000000-0000-4000-8000-000000000033';
 const learner='d0000000-0000-4000-8000-000000000044';
 await pg.query('INSERT INTO businesses(id,name) VALUES($1,$2),($3,$4)',[a,'OPADA SYNTHETIC HOTEL',b,'OPADA SYNTHETIC RESTAURANT']);
 await pg.query("INSERT INTO staff(id,business_id,role,display_name,auth_subject) VALUES($1,$2,'owner','Hotel Owner','owner-sub'),($3,$4,'staff','Hotel Staff','staff-sub')",[owner,a,learner,a]);
 const sql=async(parts,...params)=>{
  const query=parts.reduce((s,p,i)=>s+p+(i<params.length?'$'+(i+1):''),'');
  return (await pg.query(query,params)).rows;
 };
 const auth={staff:{id:owner,business_id:a,role:'owner'}};
 const invitation=await prepareStaffInvitation({sql,auth,input:{email:'student@example.test',role:'staff'}});
 assert.equal(invitation.created,true);
 assert.equal((await pg.query('SELECT token_digest FROM staff_invitations WHERE id=$1',[invitation.invitationId])).rows[0].token_digest.length,64);
 const wrong=await redeemExistingStaffInvitation({sql,secret:invitation.secret,verifiedIdentity:{subject:'staff-sub',email:'wrong@example.test',emailVerified:true}});
 assert.equal(wrong.redeemed,false);
 const accepted=await redeemExistingStaffInvitation({sql,secret:invitation.secret,verifiedIdentity:{subject:'staff-sub',email:'student@example.test',emailVerified:true}});
 assert.equal(accepted.redeemed,true);
 assert.equal(accepted.businessId,a);
 const replay=await redeemExistingStaffInvitation({sql,secret:invitation.secret,verifiedIdentity:{subject:'staff-sub',email:'student@example.test',emailVerified:true}});
 assert.equal(replay.redeemed,false);
});
