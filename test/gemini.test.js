import test from 'node:test';import assert from 'node:assert/strict';import{validateExtraction,extractWithGemini}from'../src/gemini-extract.js';
const fixture={entries:[{type:'sale',item:' jollof ',quantity:32,unit:'plate',payment_method:'mixed',unit_price_naira:null,amount_naira:null}],notes:'Prices not provided'};
test('validate multilingual example without inventing prices',()=>{const x=validateExtraction(fixture);assert.equal(x.entries[0].item,'jollof');assert.equal(x.entries[0].unit_price_kobo,null);assert.equal(x.needs_review,true)});
test('reject malformed money',()=>assert.throws(()=>validateExtraction({...fixture,entries:[{...fixture.entries[0],amount_naira:12.5}]})));
test('reject oversized extraction',()=>assert.throws(()=>validateExtraction({...fixture,entries:Array(21).fill(fixture.entries[0])})));
test('reject empty message',async()=>assert.rejects(extractWithGemini('','fake',async()=>({ok:true}))));
test('Gemini response parses and validates synthetic fixture',async()=>{const x=await extractWithGemini('We sell 32 plate jollof','fake',async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(fixture)}]}}]})}));assert.equal(x.entries.length,1)});

test('missing amount field is rejected rather than interpreted as zero',()=>assert.throws(()=>validateExtraction({...fixture,entries:[{type:'sale',item:'beans',quantity:2,unit:'plate',payment_method:'cash',unit_price_naira:null}]})));
test('unsafe kobo conversion is rejected',()=>assert.throws(()=>validateExtraction({...fixture,entries:[{...fixture.entries[0],amount_naira:Math.floor(Number.MAX_SAFE_INTEGER/100)+1}]})));
test('untrusted instruction output cannot set approved status',()=>{const x=validateExtraction({...fixture,needs_review:false});assert.equal(x.needs_review,true);assert.equal(x.entries[0].needs_review,true)});
test('no extracted entries remain review-only',()=>{const x=validateExtraction({entries:[],notes:'Cannot identify any sale'});assert.equal(x.entries.length,0);assert.equal(x.needs_review,true)});
