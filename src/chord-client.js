/** Optional Chord conversational teammate integration. Never send financial raw data or credentials. */
const BASE='https://api.chordhq.xyz';
function id(value){return typeof value==='string'&&/^[A-Za-z0-9_-]{3,100}$/.test(value)}
export function validateChordConfig(config){
 if(!config||typeof config.apiKey!=='string'||config.apiKey.length<16||!id(config.workspaceId)||!id(config.teammateId))throw Error('Chord not configured');
 return config;
}
export async function sendChordMessage({apiKey,workspaceId,teammateId,senderId,sessionId,text},fetcher=fetch){
 validateChordConfig({apiKey,workspaceId,teammateId});
 if(!id(senderId)||!id(sessionId)||typeof text!=='string'||!text.trim()||text.length>1200)throw Error('Invalid Chord message');
 const response=await fetcher(BASE+'/v1/external-chat/messages',{method:'POST',headers:{'Authorization':'Bearer '+apiKey,'Content-Type':'application/json','X-Request-ID':crypto.randomUUID()},body:JSON.stringify({workspace_id:workspaceId,teammate_id:teammateId,sender_id:senderId,session_id:sessionId,text}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Chord request failed');
 const data=await response.json();
 if(typeof data.agent_invoked!=='boolean')throw Error('Invalid Chord response');
 if(!data.agent_invoked)return {answered:false,reply:null,threadId:null,reason:typeof data.reason==='string'?data.reason:'no_reply'};
 if(typeof data.reply!=='string'||typeof data.thread_id!=='string')throw Error('Invalid Chord response');
 return {answered:true,reply:data.reply,threadId:data.thread_id,reason:null};
}
