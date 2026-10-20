import test from 'node:test';import assert from 'node:assert/strict';import {sendChordMessage} from '../src/chord-client.js';
const args={apiKey:'demo-key-not-a-real-secret-123',workspaceId:'ws_demo',teammateId:'tm_demo',senderId:'staff_demo',sessionId:'session_demo',text:'Explain the verified alert'};
test('sends correct Chord quickstart request without real credentials',async()=>{let request;const result=await sendChordMessage(args,async(url,options)=>{request={url,options};return{ok:true,json:async()=>({agent_invoked:true,thread_id:'thread_demo',reply:'Review the evidence'})}});assert.equal(request.url,'https://api.chordhq.xyz/v1/external-chat/messages');assert.equal(JSON.parse(request.options.body).workspace_id,'ws_demo');assert.equal(result.answered,true)});
test('gated no-reply response is not an error',async()=>{const result=await sendChordMessage(args,async()=>({ok:true,json:async()=>({agent_invoked:false,reason:'no_reply',reply:null,thread_id:null})}));assert.equal(result.answered,false)});
test('missing key is rejected',async()=>assert.rejects(sendChordMessage({...args,apiKey:''})));
test('oversized prompt is rejected',async()=>assert.rejects(sendChordMessage({...args,text:'x'.repeat(1201)})));
test('upstream denial does not become success',async()=>assert.rejects(sendChordMessage(args,async()=>({ok:false,status:403}))));
