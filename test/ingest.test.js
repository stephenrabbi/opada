import test from 'node:test';import assert from 'node:assert/strict';import{validateEntry}from'../src/ingest-schema.js';import{tokenDigest}from'../src/token-auth.js';
const sample={idempotency_key:'3f1c2a9e-6b7d-4c1e-9a2b-1d2e3f4a5b6c',type:'sale',item:' Jollof ',quantity:32,unit:'plate',unit_price_kobo:150000,amount_kobo:4800000,payment_method:'mixed',payment_split:{cash_kobo:3000000,transfer_kobo:1800000},raw_text:'We sell 32 jollof'};
test('validates split and trims item',()=>assert.equal(validateEntry(sample).item,'Jollof'));
test('rejects inconsistent split',()=>assert.throws(()=>validateEntry({...sample,payment_split:{cash_kobo:2000000,transfer_kobo:1800000}})));
test('rejects client business ID',()=>assert.throws(()=>validateEntry({...sample,business_id:'forged'})));
test('rejects floating point money',()=>assert.throws(()=>validateEntry({...sample,amount_kobo:3.2})));
test('rejects unrecognized authorization',()=>assert.equal(tokenDigest(''),null));
test('accepts correctly formatted bearer token digest',()=>assert.match(tokenDigest('Bearer '+ 'x'.repeat(48)),/^[a-f0-9]{64}$/));
