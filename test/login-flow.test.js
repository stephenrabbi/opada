import test from 'node:test';
import assert from 'node:assert/strict';
import {beginVerifiedStaffSession} from '../src/login-flow.js';
const staff={id:'staff-a',business_id:'restaurant-a',display_name:'Synthetic',role:'staff'};
const verified={subject:'trusted-user',email:'staff@example.test',emailVerified:true};
test('verified active membership is required before session is created',async()=>{
 let calls=0;
 const sql=async(parts,...values)=>{
  calls++;
  const query=parts.join('?');
  if(query.includes('FROM staff s')&&query.includes('LIMIT 2'))return [staff];
  if(query.includes('INSERT INTO staff_sessions'))return [{id:'session-a',expires_at:'2026-10-23T00:00:00Z'}];
  throw Error('Unexpected query');
 };
 const result=await beginVerifiedStaffSession({sql,identityToken:'trusted-token',verify:async()=>verified});
 assert.match(result.secret,/^[A-Za-z0-9_-]{43}$/);
 assert.equal(result.staff.role,'staff');assert.equal(calls,2);
});
test('invalid identity and unknown or duplicate staff do not create sessions',async()=>{
 let writes=0;
 const sql=async(parts)=>{
  const query=parts.join('?');
  if(query.includes('INSERT INTO staff_sessions'))writes++;
  return query.includes('LIMIT 2')?[staff,staff]:[];
 };
 assert.equal(await beginVerifiedStaffSession({sql,identityToken:'token',verify:async()=>null}),null);
 assert.equal(await beginVerifiedStaffSession({sql,identityToken:'token',verify:async()=>verified}),null);
 assert.equal(writes,0);
});
