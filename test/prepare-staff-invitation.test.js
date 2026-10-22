import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareStaffInvitation} from '../src/prepare-staff-invitation.js';
const owner={staff:{id:'staff-owner-a',role:'owner',business_id:'11111111-1111-4111-8111-111111111111'}};
test('only owners can prepare invitations',async()=>{
 let called=false;
 const sql=async()=>{called=true;return []};
 for(const role of ['manager','staff']){
  assert.deepEqual(await prepareStaffInvitation({sql,auth:{staff:{...owner.staff,role}},input:{email:'a@example.com',role:'staff'}}),{created:false});
 }
 assert.equal(called,false);
});
test('invitations derive tenant and inviter server-side and do not permit owner grants',async()=>{
 let query='',values=[];
 const sql=async(parts,...params)=>{query=parts.join('?');values=params;return [{id:'invite',expires_at:'2026-10-24T00:00:00Z'}]};
 const created=await prepareStaffInvitation({sql,auth:owner,input:{email:'WORKER@EXAMPLE.COM',role:'staff'},now:new Date('2026-10-22T00:00:00Z')});
 assert.equal(created.created,true);
 assert.equal(values[0],owner.staff.business_id);
 assert.equal(values[1],owner.staff.id);
 assert.equal(values[2],'worker@example.com');
 assert.equal(values[3],'staff');
 assert.match(values[4],/^[a-f0-9]{64}$/);
 assert.notEqual(created.secret,values[4]);
 assert.ok(query.includes('INSERT INTO staff_invitations'));
 await assert.rejects(()=>prepareStaffInvitation({sql,auth:owner,input:{email:'x@example.com',role:'owner'}}));
 await assert.rejects(()=>prepareStaffInvitation({sql,auth:owner,input:{email:'x@example.com',role:'staff',business_id:'another'}}));
});
