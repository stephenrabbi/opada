import test from 'node:test';
import assert from 'node:assert/strict';
import {loginFeatureEnabled,validateLoginPayload} from '../src/login-policy.js';
test('login is disabled unless every rollout and provider prerequisite is present',()=>{
 const env={OPADA_SESSION_LOGIN_ENABLED:'true',OPADA_SESSION_READ_ENABLED:'true',DATABASE_URL:'synthetic',OPADA_IDENTITY_ISSUER:'https://id.example',OPADA_IDENTITY_AUDIENCE:'opada',OPADA_IDENTITY_JWKS_URL:'https://id.example/jwks'};
 assert.equal(loginFeatureEnabled(env),true);
 for(const key of Object.keys(env))assert.equal(loginFeatureEnabled({...env,[key]:''}),false,key);
 assert.equal(loginFeatureEnabled({}),false);
});
test('login accepts only a single JWT input field',()=>{
 const jwt='a'.repeat(24)+'.'+'b'.repeat(24)+'.'+'c'.repeat(24);
 assert.equal(validateLoginPayload({identityToken:jwt}),jwt);
 for(const input of [null,[],{}, {identityToken:jwt,business_id:'other'}, {identityToken:'bad'}, {identityToken:123}]){
  assert.equal(validateLoginPayload(input),null);
 }
});
