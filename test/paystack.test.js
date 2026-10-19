import test from 'node:test';import assert from 'node:assert/strict';import{createHmac}from'node:crypto';import{verifyPaystackSignature,validPaystackEvent,verifyTestTransaction}from'../src/paystack.js';
const secret='sk_test_example_not_real',payload=JSON.stringify({event:'charge.success',data:{reference:'opada_1234',status:'success',domain:'test',currency:'NGN',amount:250000,paid_at:'2026-10-19T12:00:00Z'}});const signature=createHmac('sha512',secret).update(payload).digest('hex');
test('valid signed test event',()=>{assert.equal(verifyPaystackSignature(payload,signature,secret),true);assert.equal(validPaystackEvent(JSON.parse(payload)),true)});
test('rejects altered payload',()=>assert.equal(verifyPaystackSignature(payload+'x',signature,secret),false));
test('rejects live secret in test-only handler',()=>assert.equal(verifyPaystackSignature(payload,signature,'sk_live_something'),false));
test('rejects live-domain events',()=>assert.equal(validPaystackEvent({...JSON.parse(payload),data:{...JSON.parse(payload).data,domain:'live'}}),false));
test('rejects unsupported events',()=>assert.equal(validPaystackEvent({...JSON.parse(payload),event:'transfer.success'}),false));
test('requires independent verification response',async()=>{const d=await verifyTestTransaction('opada_1234',secret,async()=>({ok:true,json:async()=>({status:true,data:JSON.parse(payload).data})}));assert.equal(d.amount,250000)});
test('rejects different transaction reference',async()=>await assert.rejects(verifyTestTransaction('opada_1234',secret,async()=>({ok:true,json:async()=>({status:true,data:{...JSON.parse(payload).data,reference:'other_1234'}})}))));
