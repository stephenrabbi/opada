import test from 'node:test';
import assert from 'node:assert/strict';
import {validateInvitationInput,canInviteStaff,generateInvitationSecret,invitationDigest,invitationDigestMatches,invitationExpiry} from '../src/staff-invitation.js';

test('owner alone can initiate invitations; no invitation can grant owner role',()=>{
  assert.equal(canInviteStaff('owner'),true);
  for(const role of ['manager','staff','',null])assert.equal(canInviteStaff(role),false);
  for(const role of ['owner','admin','auditor',''])assert.throws(()=>validateInvitationInput({email:'staff@example.com',role}));
});
test('validate and normalize invitee input, reject cross-tenant or privilege injection',()=>{
  assert.deepEqual(validateInvitationInput({email:'  STAFF@Example.com ',role:'staff'}),{email:'staff@example.com',role:'staff'});
  for(const field of ['business_id','staff_id','created_by','active','verified']){
    assert.throws(()=>validateInvitationInput({email:'staff@example.com',role:'manager',[field]:'other-tenant'}));
  }
  for(const email of ['a','a@b','a b@example.com','x'.repeat(256)+'@example.com']){
    assert.throws(()=>validateInvitationInput({email,role:'staff'}));
  }
});
test('secure invitation tokens are random, only SHA-256 digests should be persisted',()=>{
  const one=generateInvitationSecret(),two=generateInvitationSecret();
  assert.notEqual(one,two);
  assert.match(one,/^[A-Za-z0-9_-]{43}$/);
  const digest=invitationDigest(one);
  assert.match(digest,/^[a-f0-9]{64}$/);
  assert.equal(invitationDigestMatches(one,digest),true);
  assert.equal(invitationDigestMatches(two,digest),false);
  assert.equal(invitationDigest('invalid'),null);
  assert.equal(invitationDigestMatches(one,'bad'),false);
});
test('invitation expiry is fixed at 48 hours',()=>{
  assert.equal(invitationExpiry(new Date('2026-10-22T12:00:00Z')).toISOString(),'2026-10-24T12:00:00.000Z');
});
