import test from 'node:test';
import assert from 'node:assert/strict';
import {createStaffSession,revokeStaffSession,findActiveStaffSession} from '../src/session-store.js';
const staff={id:'staff-A',business_id:'restaurant-A'};
test('session creation is scoped to existing active staff',async()=>{
 let statement='',params=[];
 const sql=async(parts,...values)=>{statement=parts.join('?');params=values;return [{id:'session-1',expires_at:'2026-10-22T22:00:00Z'}]};
 const result=await createStaffSession({sql,staff,now:new Date('2026-10-22T14:00:00Z')});
 assert.match(result.secret,/^[A-Za-z0-9_-]{43}$/);
 assert.match(params[0],/^[a-f0-9]{64}$/);
 assert.equal(params[3],staff.id);
 assert.equal(params[4],staff.business_id);
 assert.match(statement,/s.active=true/);
});
test('revocation and lookup require valid token digests',async()=>{
 let calls=0;
 const sql=async(parts,...values)=>{calls++;return []};
 assert.equal(await revokeStaffSession({sql,secret:'invalid'}),false);
 assert.equal(await findActiveStaffSession({sql,secret:'invalid'}),null);
 assert.equal(calls,0);
});
test('lookup refuses duplicate or invalid staff results',async()=>{
 const secret='A'.repeat(43);
 const row={staff_id:'staff-A',business_id:'restaurant-A',role:'staff'};
 assert.deepEqual(await findActiveStaffSession({sql:async()=>[row],secret}),row);
 assert.equal(await findActiveStaffSession({sql:async()=>[row,row],secret}),null);
 assert.equal(await findActiveStaffSession({sql:async()=>[{...row,role:'root'}],secret}),null);
});
