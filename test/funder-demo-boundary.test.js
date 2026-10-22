import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('public funder demo remains explicitly synthetic and browser-local',async()=>{
 const demo=await readFile(new URL('../app/demo/page.jsx',import.meta.url),'utf8');
 const home=await readFile(new URL('../app/page.jsx',import.meta.url),'utf8');
 assert.match(demo,/SYNTHETIC DATA/);
 assert.match(demo,/Not connected to Neon, Paystack, Gemini or customer accounts/);
 assert.match(home,/href="\/demo"/);
 assert.match(home,/Try interactive demo/);
 // Demo must not retrieve customer records, call payments or access server credentials.
 assert.doesNotMatch(demo,/\bfetch\s*\(|XMLHttpRequest|\baxios\b|@neondatabase|process\.env|\bneon\s*\(|\bserverAction\b/);
 assert.doesNotMatch(demo,/href="\/api\//);
});
