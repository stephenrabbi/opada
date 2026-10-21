import {NextResponse} from 'next/server';
import {authorizeStaff} from '../../../../src/staff-auth.js';
import {ingestMessage} from '../../../../src/message-ingest.js';
import {reserveGeminiCall} from '../../../../src/gemini-budget.js';
import {extractRecords} from '../../../../src/ai.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
// Gemini has a 12 s timeout; leave room for the DB writes and checks (Hobby allows up to 60 s).
export const maxDuration=30;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function reply(data,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})}
export async function POST(request){
 let auth;try{auth=await authorizeStaff(request)}catch{return reply({error:'Authentication unavailable'},503)}
 if(!auth)return reply({error:'Unauthorized'},401);
 let body;try{body=await request.json()}catch{return reply({error:'Invalid JSON'},400)}
 const keys=body&&typeof body==='object'?Object.keys(body):[];
 if(!keys.length||keys.some(k=>!['text','idempotency_key','source'].includes(k)))return reply({error:'Unexpected fields'},422);
 if(typeof body.text!=='string'||!body.text.trim()||body.text.length>4000)return reply({error:'Message must be 1 to 4000 characters'},422);
 if(typeof body.idempotency_key!=='string'||!uuid.test(body.idempotency_key))return reply({error:'Invalid idempotency key'},422);
 const source=body.source??'text';
 if(!['text','voice_transcript'].includes(source))return reply({error:'Invalid source'},422);
 const run=(text,params)=>auth.sql.query(text,params);
 try{
  const result=await ingestMessage({run,staff:auth.staff,text:body.text.trim(),idempotencyKey:body.idempotency_key.toLowerCase(),source,
   reserve:()=>reserveGeminiCall(run),extract:text=>extractRecords(text)});
  return reply({saved:true,...result},result.duplicate?200:201);
 }catch{return reply({error:'Unable to store message'},503)}
}
