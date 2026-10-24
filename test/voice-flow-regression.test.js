import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const voice=read('app/staff/VoiceReport.jsx');
const staff=read('app/staff/page.jsx');
const owner=read('app/owner/page.jsx');
const ingest=read('app/api/ingest/route.js');
const entries=read('app/api/entries/route.js');
const voiceApi=read('app/api/voice/route.js');

test('Google transcription requires staff bearer auth before contacting provider',()=>{
 assert.match(voice,/Authorization:'Bearer '\+accessToken\.trim\(\)/);
 assert.match(voiceApi,/const auth=await authorizeStaff\(request\)/);
 const authenticated=voiceApi.indexOf('const auth=await authorizeStaff(request)');
 const outbound=voiceApi.indexOf("const googleResponse=await fetch('https://speech.googleapis.com/");
 assert.ok(authenticated>=0&&outbound>authenticated);
 assert.match(voiceApi,/if\(!auth\)return reply\(\{error:'Unauthorized'\},401\)/);
});

test('successful Google transcript reaches staff report and proposed fields',()=>{
 assert.match(voice,/onTranscript\(result\.transcript\)/);
 assert.match(staff,/<VoiceReport accessToken=\{token\}/);
 assert.match(staff,/onTranscript=\{text=>\{setNote\(text\);const parsed=extractReport\(text\)/);
 assert.match(staff,/setItem\(parsed\.fields\.item\|\|''\)/);
 assert.match(staff,/setQuantity\(parsed\.fields\.quantity\|\|''\)/);
 assert.match(staff,/setPrice\(parsed\.fields\.price\|\|''\)/);
 assert.match(staff,/setPayment\(parsed\.fields\.payment\|\|'unknown'\)/);
 assert.match(staff,/Nothing has been saved yet/);
});

test('staff save is authenticated, idempotent, confirmed by entry id and never claims verified payment',()=>{
 assert.match(staff,/fetch\('\/api\/ingest',\{method:'POST'/);
 assert.match(staff,/idempotency_key:submission\.current\.key/);
 assert.match(staff,/if\(!d\.saved\|\|!d\.entry_id\)throw Error/);
 assert.match(ingest,/authorizeStaff\(request,\['owner','manager','staff'\]\)/);
 assert.match(ingest,/ON CONFLICT \(business_id,idempotency_key\) DO NOTHING/);
 assert.match(ingest,/needs_review:true/);
 assert.match(staff,/Financial processing is not automatic/);
});

test('staff receipt and owner transaction list refer to same business-scoped entries endpoint',()=>{
 assert.match(staff,/fetch\('\/api\/entries'/);
 assert.match(staff,/body\.entries\.some\(x=>x\.id===d\.entry_id\)/);
 assert.match(staff,/receiptVisible\?'Confirmed in the owner-visible transactions API/);
 assert.match(owner,/fetch\('\/api\/entries'/);
 assert.match(owner,/setEntries\(Array\.isArray\(en\.entries\)\?en\.entries:\[\]\)/);
 assert.match(owner,/filteredEntries\.map\(e=>/);
 assert.match(entries,/WHERE business_id=\$\{a\.staff\.business_id\}/);
 assert.match(entries,/ORDER BY created_at DESC LIMIT 100/);
 assert.match(owner,/reports awaiting human review/i);
});
