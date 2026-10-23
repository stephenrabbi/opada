import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loginFeatureEnabled} from '../src/login-policy.js';

test('public login defaults off even when a database exists',()=>{
 assert.equal(loginFeatureEnabled({DATABASE_URL:'postgres://synthetic.invalid/test'}),false);
 assert.equal(loginFeatureEnabled({DATABASE_URL:'postgres://synthetic.invalid/test',OPADA_SESSION_LOGIN_ENABLED:'true'}),false);
});

test('production login route must check identity provider and feature gate before any database connection',async()=>{
 const code=await readFile(new URL('../app/api/session/login/route.js',import.meta.url),'utf8');
 const gate=code.indexOf('if(!loginFeatureEnabled()||!identityProviderConfig())');
 const db=code.indexOf('neon(process.env.DATABASE_URL)');
 assert.ok(gate>=0,'login feature gate must exist');
 assert.ok(db<0||gate<db,'feature gate must precede database connection');
 assert.match(code,/status:404/);
});

test('session signing secrets or identity provider keys must not be embedded in public demo',async()=>{
 const page=await readFile(new URL('../app/demo/page.jsx',import.meta.url),'utf8');
 assert.doesNotMatch(page,/OPADA_IDENTITY_|DATABASE_URL|PAYSTACK_TEST_SECRET_KEY|sessionCookie\(/);
});
