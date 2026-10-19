import {NextResponse} from 'next/server';import {tokenDigest} from '../../../src/token-auth.js';import{validateEntry}from'../../../src/ingest-schema.js';export const runtime='nodejs';
export async function POST(request){
 const hash=tokenDigest(request.headers.get('authorization'));
 if(!hash)return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!process.env.DATABASE_URL)return NextResponse.json({error:'Database unavailable'},{status:503});
 let entry;try{entry=validateEntry(await request.json())}catch{return NextResponse.json({error:'Invalid transaction fields'},{status:422})}
 try{
  const {neon}=await import('@neondatabase/serverless');
  const sql=neon(process.env.DATABASE_URL);
  const staff=await sql`SELECT s.id,s.business_id FROM staff_api_tokens t JOIN staff s ON s.id=t.staff_id WHERE t.token_hash=${hash} AND t.revoked_at IS NULL AND (t.expires_at IS NULL OR t.expires_at>now()) AND s.active=true LIMIT 1`;
  if(!staff.length)return NextResponse.json({error:'Unauthorized'},{status:401});
  const actor=staff[0];
  const result=await sql`INSERT INTO entries(business_id,type,item,quantity,unit,unit_price_kobo,amount_kobo,payment_method,payment_split,recorded_by,raw_text,source,needs_review) VALUES(${actor.business_id},${entry.type},${entry.item},${entry.quantity},${entry.unit},${entry.unit_price_kobo},${entry.amount_kobo},${entry.payment_method},${JSON.stringify(entry.payment_split)}::jsonb,${actor.id},${entry.raw_text},'text',true) RETURNING id,created_at`;
  return NextResponse.json({entry_id:result[0].id,created_at:result[0].created_at,saved:true,needs_review:true,processing:'not_enabled'}, {status:201});
 }catch{return NextResponse.json({error:'Unable to store transaction'},{status:503})}
}