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
 assert.equal(r.fields.payment,'unknown');
 assert.ok(r.warnings.some(x=>x.includes('Mixed cash')));
});
test('unknown language text does not invent prices',()=>{
 const r=extractReport('Mo ta awo iresi mewa.');
 assert.equal(r.fields.price,undefined);assert.equal(r.fields.payment,undefined);
});
test('empty transcript is safe',()=>{const r=extractReport('');assert.deepEqual(r.fields,{});assert.ok(r.warnings.length)});

test('spoken eighteen hundred naira extraction',()=>{
 const r=extractReport('We sold three plates of fried rice at eighteen hundred naira each, paid by transfer.');
 assert.deepEqual(r.fields,{quantity:'3',item:'fried rice',price:'1800',payment:'transfer'});
});
test('spoken one thousand five hundred price',()=>{
 const r=extractReport('Sold two plates of jollof rice at one thousand five hundred naira each paid cash.');
 assert.equal(r.fields.quantity,'2');assert.equal(r.fields.price,'1500');assert.equal(r.fields.payment,'cash');
});
test('no missing price is invented',()=>{
 const r=extractReport('Sold three plates of fried rice paid by transfer');
 assert.equal(r.fields.price,undefined);
 assert.ok(r.warnings.some(x=>x.includes('Unit price not extracted')));
});

test('Pidgin phrasing extracts only explicit quantities and unit price',()=>{
 const r=extractReport('3 plate fried rice don comot, 1800 each, dem transfer am');
 assert.deepEqual(r.fields,{quantity:'3',item:'fried rice',price:'1800',payment:'transfer'});
});
test('Pidgin phrasing without price does not invent amount',()=>{
 const r=extractReport('3 plate fried rice don comot, dem transfer am');
 assert.equal(r.fields.quantity,'3');
 assert.equal(r.fields.price,undefined);
 assert.equal(r.fields.payment,'transfer');
});
