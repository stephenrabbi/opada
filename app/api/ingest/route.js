import {NextResponse} from 'next/server';import {tokenDigest} from '../../../src/token-auth.js';import{validateEntry,TotalMismatchError}from'../../../src/ingest-schema.js';import{runChecksSafely}from'../../../src/checks.js';export const runtime='nodejs';
export async function POST(request){
 const hash=tokenDigest(request.headers.get('authorization'));
 if(!hash)return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!process.env.DATABASE_URL)return NextResponse.json({error:'Database unavailable'},{status:503});
 let entry;try{entry=validateEntry(await request.json())}catch(e){
  if(e instanceof TotalMismatchError)return NextResponse.json({error:'Total does not equal quantity × unit price',code:'TOTAL_MISMATCH',expected_amount_kobo:e.expectedKobo},{status:422});
  return NextResponse.json({error:'Invalid transaction fields'},{status:422})}
 try{
  const {neon}=await import('@neondatabase/serverless');
  const sql=neon(process.env.DATABASE_URL);
  const staff=await sql`SELECT s.id,s.business_id FROM staff_api_tokens t JOIN staff s ON s.id=t.staff_id WHERE t.token_hash=${hash} AND t.revoked_at IS NULL AND (t.expires_at IS NULL OR t.expires_at>now()) AND s.active=true LIMIT 1`;
  if(!staff.length)return NextResponse.json({error:'Unauthorized'},{status:401});
  const actor=staff[0];
  // amount_kobo is the server-checked total (validateEntry rejects anything else).
  const result=await sql`INSERT INTO entries(business_id,type,item,quantity,unit,unit_price_kobo,amount_kobo,payment_method,payment_split,recorded_by,raw_text,source,needs_review,idempotency_key) VALUES(${actor.business_id},${entry.type},${entry.item},${entry.quantity},${entry.unit},${entry.unit_price_kobo},${entry.amount_kobo},${entry.payment_method},${JSON.stringify(entry.payment_split)}::jsonb,${actor.id},${entry.raw_text},'text',true,${entry.idempotency_key}) ON CONFLICT (business_id,idempotency_key) DO NOTHING RETURNING id,created_at`;
  if(result.length){const checks=await runChecksSafely((t,p)=>sql.query(t,p),actor.business_id);return NextResponse.json({entry_id:result[0].id,created_at:result[0].created_at,saved:true,duplicate:false,needs_review:true,checks}, {status:201})}
  // Same submission seen before (double tap or retry): return the original entry, save nothing.
  const original=await sql`SELECT id,created_at FROM entries WHERE business_id=${actor.business_id} AND idempotency_key=${entry.idempotency_key} LIMIT 1`;
  if(!original.length)return NextResponse.json({error:'Unable to store transaction'},{status:503});
  return NextResponse.json({entry_id:original[0].id,created_at:original[0].created_at,saved:true,duplicate:true,needs_review:true});
 }catch{return NextResponse.json({error:'Unable to store transaction'},{status:503})}
}
