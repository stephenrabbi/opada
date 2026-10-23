import test from 'node:test';
import assert from 'node:assert/strict';
import {extractReport} from '../src/voice-report-extract.js';
test('extract explicit price, item, quantity, and single cash method',()=>{
 const r=extractReport('Sold 12 plates of jollof rice at 1,500 naira each, paid cash.');
 assert.deepEqual(r.fields,{quantity:'12',item:'jollof rice',price:'1500',payment:'cash'});
});
test('mixed methods never infer transfer verification or cash-only payment',()=>{
 const r=extractReport('I sell ten plates of rice at 1500 naira each, six cash and four transfer.');
 assert.equal(r.fields.quantity,'10');
 assert.equal(r.fields.payment,undefined);
 assert.ok(r.warnings.some(x=>x.includes('Mixed cash')));
});
test('unknown language text does not invent prices',()=>{
 const r=extractReport('Mo ta awo iresi mewa.');
 assert.equal(r.fields.price,undefined);assert.equal(r.fields.payment,undefined);
});
test('empty transcript is safe',()=>{const r=extractReport('');assert.deepEqual(r.fields,{});assert.ok(r.warnings.length)});
