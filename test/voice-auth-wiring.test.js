import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const staff=readFileSync(new URL('../app/staff/page.jsx',import.meta.url),'utf8');
const voice=readFileSync(new URL('../app/staff/VoiceReport.jsx',import.meta.url),'utf8');
const route=readFileSync(new URL('../app/api/voice/route.js',import.meta.url),'utf8');

test('signed-in staff token is supplied to voice component',()=>{
 assert.match(staff,/<VoiceReport\\s+accessToken=\\{token\\}/);
});
test('Google Cloud transcription sends staff bearer authorization',()=>{
 assert.match(voice,/fetch\\('\/api\/voice',\\{method:'POST',headers:\\{Authorization:'Bearer '\+accessToken\\.trim\\(\\)\\}/);
});
test('voice API authenticates request before audio reaches Google',()=>{
 const authIndex=route.indexOf('authorizeStaff(request)');
 const providerIndex=route.indexOf("fetch('https://speech.googleapis.com/v2/");
 assert.ok(authIndex>=0&&providerIndex>authIndex,'Staff authentication must precede Google API call');
});
