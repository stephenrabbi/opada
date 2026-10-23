import test from 'node:test';
import assert from 'node:assert/strict';
import {loginFeatureEnabled,validateLoginPayload} from '../src/login-policy.js';
import {originIsAllowed} from '../src/session-origin.js';
import {identityProviderConfig} from '../src/verify-identity-token.js';

const safeEnv={
  DATABASE_URL:'postgres://placeholder.invalid/opada',
  OPADA_SESSION_LOGIN_ENABLED:'true',
  OPADA_SESSION_READ_ENABLED:'true',
  OPADA_IDENTITY_ISSUER:'https://identity.example.invalid/',
  OPADA_IDENTITY_AUDIENCE:'opada-test',
  OPADA_IDENTITY_JWKS_URL:'https://identity.example.invalid/.well-known/jwks.json'
};

test('live login remains fail-closed unless every server-side gate is configured',()=>{
  assert.equal(loginFeatureEnabled({}),false);
  for(const key of Object.keys(safeEnv)){
    const incomplete={...safeEnv};
    delete incomplete[key];
    assert.equal(loginFeatureEnabled(incomplete),false,'Missing '+key+' must disable login');
  }
  assert.equal(loginFeatureEnabled(safeEnv),true);
  assert.equal(identityProviderConfig(safeEnv)?.issuer,safeEnv.OPADA_IDENTITY_ISSUER);
});

test('identity configuration rejects untrusted network destinations and origins',()=>{
  for(const changed of [
    {OPADA_IDENTITY_ISSUER:'http://identity.example.invalid/'},
    {OPADA_IDENTITY_JWKS_URL:'http://identity.example.invalid/jwks'},
    {OPADA_IDENTITY_JWKS_URL:'https://other.example.invalid/jwks'},
    {OPADA_IDENTITY_JWKS_URL:'https://username:password@identity.example.invalid/jwks'},
    {OPADA_IDENTITY_ISSUER:'https://identity.example.invalid/?untrusted=1'}
  ])assert.equal(identityProviderConfig({...safeEnv,...changed}),null);
});

test('cookie-changing requests require exact same-origin HTTPS',()=>{
  const request=(url,origin)=>({url,headers:{get:key=>key==='origin'?origin:null}});
  assert.equal(originIsAllowed(request('https://opada.example.invalid/api/session/login','https://opada.example.invalid')),true);
  assert.equal(originIsAllowed(request('https://opada.example.invalid/api/session/login','https://evil.example.invalid')),false);
  assert.equal(originIsAllowed(request('https://opada.example.invalid/api/session/login',null)),false);
  assert.equal(originIsAllowed(request('http://opada.example.invalid/api/session/login','http://opada.example.invalid')),false);
});

test('login payload rejects extra fields and malformed bearer tokens',()=>{
  const jwt=['a'.repeat(20),'b'.repeat(20),'c'.repeat(20)].join('.');
  assert.equal(validateLoginPayload({identityToken:jwt}),jwt);
  for(const bad of [{identityToken:jwt,role:'owner'},{identityToken:123},[],null,{identityToken:'short'},{}])
    assert.equal(validateLoginPayload(bad),null);
});
