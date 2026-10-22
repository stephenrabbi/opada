import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,SignJWT} from 'jose';
import {identityProviderConfig,verifyIdentityToken} from '../src/verify-identity-token.js';

const config={issuer:'https://accounts.example.test',audience:'opada-dev',jwksUrl:'https://accounts.example.test/.well-known/jwks.json'};
const now=Math.floor(Date.now()/1000);
const claims={email:'staff@example.test',email_verified:true};
test('identity provider configuration is explicitly configured and HTTPS-only',()=>{
 assert.deepEqual(identityProviderConfig({OPADA_IDENTITY_ISSUER:config.issuer,OPADA_IDENTITY_AUDIENCE:config.audience,OPADA_IDENTITY_JWKS_URL:config.jwksUrl}),config);
 for(const url of ['http://accounts.example.test/keys','https://evil.example/keys','file:///etc/passwd']){
  assert.equal(identityProviderConfig({OPADA_IDENTITY_ISSUER:config.issuer,OPADA_IDENTITY_AUDIENCE:config.audience,OPADA_IDENTITY_JWKS_URL:url}),null);
 }
 assert.equal(identityProviderConfig({}),null);
});
test('cryptographically valid RS256 tokens require issuer, audience, verified email and unexpired claims',async()=>{
 const {publicKey,privateKey}=await generateKeyPair('RS256');
 const keys=async()=>publicKey;
 const sign=async overrides=>new SignJWT({...claims,...overrides}).setProtectedHeader({alg:'RS256'})
  .setIssuer(config.issuer).setAudience(config.audience).setSubject('user-1')
  .setIssuedAt(now-10).setExpirationTime(now+600).sign(privateKey);
 const valid=await sign({});
 assert.deepEqual(await verifyIdentityToken(valid,{config,keySet:keys}),{subject:'user-1',email:'staff@example.test',emailVerified:true});
 assert.equal(await verifyIdentityToken(await sign({email_verified:false}),{config,keySet:keys}),null);
 assert.equal(await verifyIdentityToken(valid,{config:{...config,audience:'other-app'},keySet:keys}),null);
 const {publicKey:wrongKey}=await generateKeyPair('RS256');
 assert.equal(await verifyIdentityToken(valid,{config,keySet:async()=>wrongKey}),null);
 assert.equal(await verifyIdentityToken('bad token',{config,keySet:keys}),null);
});
