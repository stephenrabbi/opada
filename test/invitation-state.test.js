import test from 'node:test';
import assert from 'node:assert/strict';
import {invitationCanBeRedeemed} from '../src/invitation-state.js';
const now=new Date('2026-10-22T10:00:00Z');
const base={invited_email:'person@example.com',invited_role:'staff',expires_at:'2026-10-23T10:00:00Z',consumed_at:null,revoked_at:null,accepted_by:null};
test('only verified email matches allowed pending record',()=>{
 assert.equal(invitationCanBeRedeemed(base,'PERSON@example.com',now),true);
 assert.equal(invitationCanBeRedeemed(base,'attacker@example.com',now),false);
 assert.equal(invitationCanBeRedeemed(base,'',now),false);
});
test('revoked, consumed, accepted and expired invitations must fail closed',()=>{
 for(const v of [{revoked_at:'2026-10-22T09:00:00Z'},{consumed_at:'2026-10-22T09:00:00Z'},{accepted_by:'some-staff-id'},{expires_at:'2026-10-22T10:00:00Z'},{expires_at:'invalid'},{invited_role:'owner'}]){
  assert.equal(invitationCanBeRedeemed({...base,...v},'person@example.com',now),false);
 }
});
test('untrusted or missing record state fails closed',()=>{
 for(const record of [null,undefined,{},[]])assert.equal(invitationCanBeRedeemed(record,'person@example.com',now),false);
});
