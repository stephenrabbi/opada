import test from 'node:test';
import assert from 'node:assert/strict';
import {redeemExistingStaffInvitation} from '../src/redeem-staff-invitation.js';
const secret='A'.repeat(43);
const verified={email:'person@example.com',emailVerified:true,subject:'provider|person'};
test('redemption fails closed for malformed tokens and unverified identity',async()=>{
 let calls=0;
 const sql=async()=>{calls++;return []};
 for(const identity of [null,{...verified,emailVerified:false},{...verified,subject:''},{...verified,email:'invalid'}]){
  assert.deepEqual(await redeemExistingStaffInvitation({sql,secret,verifiedIdentity:identity}),{redeemed:false});
 }
 assert.deepEqual(await redeemExistingStaffInvitation({sql,secret:'bad',verifiedIdentity:verified}),{redeemed:false});
 assert.equal(calls,0);
});
test('guarded query verifies subject, tenant, role, expiration and unused status',async()=>{
 let statement='';
 const sql=async(parts,...parameters)=>{
  statement=parts.join(' ? ');
  assert.equal(parameters.length,5);
  assert.equal(parameters[2],'person@example.com');
  assert.equal(parameters[4],'provider|person');
  return [{id:'invite-1',business_id:'restaurant-1',accepted_by:'staff-1'}];
 };
 const value=await redeemExistingStaffInvitation({sql,secret,verifiedIdentity:verified,now:new Date('2026-10-22T12:00:00Z')});
 assert.equal(value.redeemed,true);
 for(const fragment of ['UPDATE staff_invitations','consumed_at IS NULL','revoked_at IS NULL','accepted_by IS NULL','recipient.business_id=inv.business_id','recipient.auth_subject=','recipient.role=inv.invited_role','inv.expires_at>'])assert.ok(statement.includes(fragment),fragment);
});
test('no matching row results in no redemption',async()=>{
 assert.deepEqual(await redeemExistingStaffInvitation({sql:async()=>[],secret,verifiedIdentity:verified}),{redeemed:false});
});
