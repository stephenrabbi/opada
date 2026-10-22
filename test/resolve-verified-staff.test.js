import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveVerifiedStaff} from '../src/resolve-verified-staff.js';

const identity={subject:'provider-person-1',email:'staff@example.test',emailVerified:true};
const staff={id:'staff-1',business_id:'tenant-a',display_name:'Synthetic Staff',role:'staff'};
test('verified subject resolves precisely one active restaurant membership',async()=>{
 let query='',values=[];
 const result=await resolveVerifiedStaff({identityToken:'synthetic',verify:async()=>identity,sql:async(parts,...params)=>{query=parts.join('?');values=params;return [staff]}});
 assert.equal(result.staff.business_id,'tenant-a');
 assert.deepEqual(values,['provider-person-1']);
 assert.match(query,/s\.active=true/);
 assert.match(query,/LIMIT 2/);
});
test('unverified identities, absent or duplicate memberships fail closed',async()=>{
 let calls=0;
 const sql=async()=>{calls++;return [staff]};
 assert.equal(await resolveVerifiedStaff({identityToken:'none',verify:async()=>null,sql}),null);
 assert.equal(calls,0);
 assert.equal(await resolveVerifiedStaff({identityToken:'x',verify:async()=>identity,sql:async()=>[]}),null);
 assert.equal(await resolveVerifiedStaff({identityToken:'x',verify:async()=>identity,sql:async()=>[staff,{...staff,id:'staff-2',business_id:'tenant-b'}]}),null);
 assert.equal(await resolveVerifiedStaff({identityToken:'x',verify:async()=>identity,sql:async()=>[{...staff,role:'superadmin'}]}),null);
});
