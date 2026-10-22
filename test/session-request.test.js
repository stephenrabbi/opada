import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionSecretFromCookie,resolveRequestSession} from '../src/session-request.js';
import {SESSION_COOKIE_NAME} from '../src/session-policy.js';
const secret='A'.repeat(43);
test('session cookie parsing accepts exactly one properly shaped cookie',()=>{
 assert.equal(sessionSecretFromCookie('other=1; '+SESSION_COOKIE_NAME+'='+secret),secret);
 assert.equal(sessionSecretFromCookie(SESSION_COOKIE_NAME+'='+secret+'; '+SESSION_COOKIE_NAME+'='+secret),null);
 assert.equal(sessionSecretFromCookie(SESSION_COOKIE_NAME+'=bad'),null);
 assert.equal(sessionSecretFromCookie('other=1'),null);
});
test('missing cookies cannot trigger session storage lookup',async()=>{
 let called=false;
 const sql=async()=>{called=true;return []};
 const result=await resolveRequestSession({request:{headers:{get:()=>null}},sql});
 assert.equal(result,null);assert.equal(called,false);
});
test('session request resolves database-scoped identity only',async()=>{
 const request={headers:{get:()=>SESSION_COOKIE_NAME+'='+secret}};
 const person={staff_id:'s1',business_id:'b1',role:'staff',display_name:'Synthetic'};
 const result=await resolveRequestSession({request,sql:async()=>[person]});
 assert.deepEqual(result,person);
});
