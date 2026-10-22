import test from 'node:test';
import assert from 'node:assert/strict';
import {issueVerifiedStaffSession} from '../src/issue-verified-session.js';
import {sessionSecretFromCookie} from '../src/session-request.js';
import {sessionDigest} from '../src/session-policy.js';

const staff={id:'synthetic-staff-a',business_id:'synthetic-restaurant-a',role:'staff',display_name:'Test Staff'};
const identity={subject:'verified-provider-subject',emailVerified:true,email:'staff@example.invalid'};
function database({members=[staff],inserted=[{id:'session-1',expires_at:'2026-10-22T20:00:00.000Z'}]}={}){
 const log=[];
 const sql=async (parts,...params)=>{
   const query=parts.join('?'); log.push({query,params});
   if(query.includes('FROM staff s')&&query.includes('auth_subject'))return members;
   if(query.includes('INSERT INTO staff_sessions'))return inserted;
   throw Error('Unexpected SQL');
 };
 return {sql,log};
}
test('signed identity maps to one tenant and only then receives persisted opaque cookie',async()=>{
 const {sql,log}=database();
 const result=await issueVerifiedStaffSession({sql,identityToken:'signed-token',verify:async()=>identity});
 assert.equal(log.length,2);
 assert.deepEqual(log[0].params,['verified-provider-subject']);
 assert.deepEqual(log[1].params.slice(1,3),['synthetic-staff-a','synthetic-restaurant-a'].slice(0,0)); // See explicit SQL assertions below.
 assert.match(log[1].query,/s\.active=true/);
 assert.equal(log[1].params[1],'synthetic-staff-a');
 assert.equal(log[1].params[2],'synthetic-restaurant-a');
 assert.match(result.cookie,/^__Host-opada_session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800$/);
 assert.equal(result.staff.business_id,'synthetic-restaurant-a');
 assert.equal(Object.hasOwn(result,'secret'),false);
 const secret=sessionSecretFromCookie(result.cookie);
 assert.match(sessionDigest(secret),/^[a-f0-9]{64}$/);
 assert.equal(log[1].params[0],sessionDigest(secret));
});
test('unverified, missing, duplicate and role-invalid membership never create sessions',async()=>{
 for(const {verified,members} of [
   {verified:null,members:[staff]},
   {verified:identity,members:[]},
   {verified:identity,members:[staff,{...staff,id:'other',business_id:'other-tenant'}]},
   {verified:identity,members:[{...staff,role:'superadmin'}]}
 ]){
   const {sql,log}=database({members});
   const outcome=await issueVerifiedStaffSession({sql,identityToken:'signed-token',verify:async()=>verified});
   assert.equal(outcome,null);
   assert.equal(log.some(x=>x.query.includes('INSERT INTO staff_sessions')),false);
 }
});
test('failed persistence does not issue a cookie, and invalid arguments fail closed',async()=>{
 const {sql}=database({inserted:[]});
 assert.equal(await issueVerifiedStaffSession({sql,identityToken:'signed-token',verify:async()=>identity}),null);
 assert.equal(await issueVerifiedStaffSession({sql,identityToken:'',verify:async()=>identity}),null);
 assert.equal(await issueVerifiedStaffSession({sql,identityToken:'signed-token',verify:async()=>identity,now:new Date('invalid')}),null);
});
