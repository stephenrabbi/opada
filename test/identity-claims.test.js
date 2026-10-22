import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVerifiedIdentity} from '../src/identity-claims.js';
const now=Math.floor(Date.now()/1000);
const good={iss:'https://trusted.example',aud:'opada',sub:'provider-user-1',email:'  STAFF@EXAMPLE.COM ',email_verified:true,exp:now+600,iat:now-60};
const opts={issuer:'https://trusted.example',audience:'opada'};
test('only appropriate verified provider claims are normalized',()=>{
 assert.deepEqual(validateVerifiedIdentity(good,opts),{subject:'provider-user-1',email:'staff@example.com',emailVerified:true});
});
test('claims fail closed if any identity, expiry, issuer, audience or email check fails',()=>{
 for(const change of [{iss:'https://attacker.example'},{aud:'different-app'},{email_verified:false},{sub:''},{exp:now-1},{iat:now+600},{email:'not-an-email'}]){
  assert.equal(validateVerifiedIdentity({...good,...change},opts),null);
 }
 assert.equal(validateVerifiedIdentity(good,{issuer:'https://trusted.example'}),null);
 assert.equal(validateVerifiedIdentity(null,opts),null);
});
