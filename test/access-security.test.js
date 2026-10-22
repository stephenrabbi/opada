import test from 'node:test';
import assert from 'node:assert/strict';
import {tokenDigest} from '../src/token-auth.js';
import {validateEntry} from '../src/ingest-schema.js';

const token='A'.repeat(32);
test('bearer credentials only: token hash is stable, raw token not echoed',()=>{
  const digest=tokenDigest('Bearer '+token);
  assert.match(digest,/^[a-f0-9]{64}$/);
  assert.equal(tokenDigest('Bearer '+token),digest);
  assert.equal(tokenDigest('Bearer '+('B'.repeat(32)))===digest,false);
});
test('malformed or non-bearer credentials are rejected',()=>{
  for(const h of [null,'','basic '+token,'Bearer '+'a'.repeat(31),'Bearer '+'a'.repeat(257),'Bearer '+'a'.repeat(31)+'!','bearer '+token,'Bearer '+token+' ']){
    assert.equal(tokenDigest(h),null,String(h));
  }
});
const sample={type:'sale',item:'Jollof rice',quantity:2,unit:'plate',unit_price_kobo:150000,amount_kobo:300000,payment_method:'cash',payment_split:null,raw_text:'Sold two plates for cash'};
test('ingest validation refuses client-forged restaurant, actor and verification fields',()=>{
  for(const property of ['business_id','recorded_by','staff_id','verified','needs_review','source','payment_verified']){
    assert.throws(()=>validateEntry({...sample,[property]:'forged'}),/Unexpected field/);
  }
});
test('ingest validation rejects invalid mixed amounts and accepts exact splits',()=>{
  assert.throws(()=>validateEntry({...sample,payment_method:'mixed',payment_split:{cash_kobo:100000,transfer_kobo:100000}}),/Invalid split/);
  const x=validateEntry({...sample,payment_method:'mixed',payment_split:{cash_kobo:100000,transfer_kobo:200000}});
  assert.equal(x.payment_split.transfer_kobo,200000);
});
