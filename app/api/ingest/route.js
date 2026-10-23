import {NextResponse} from 'next/server';
import {authorizeStaff} from '../../../src/staff-auth.js';
import {validateEntry,TotalMismatchError} from '../../../src/ingest-schema.js';
import {runChecksSafely} from '../../../src/checks.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'private, no-store'};
export async function POST(request){
 let auth;
 try{auth=await authorizeStaff(request,['owner','manager','staff'])}
 catch{return NextResponse.json({error:'Authentication unavailable'},{status:503,headers:noStore})}
 if(!auth)return NextResponse.json({error:'Unauthorized'},{status:401,headers:noStore});
 let entry;
 try{entry=validateEntry(await request.json())}
 catch(e){
  if(e instanceof TotalMismatchError)return NextResponse.json({error:'Total does not equal quantity × unit price',code:'TOTAL_MISMATCH',expected_amount_kobo:e.expectedKobo},{status:422,headers:noStore});
  return NextResponse.json({error:'Invalid transaction fields'},{status:422,headers:noStore});
 }
 try{
  const {sql,staff}=auth;
  const result=await sql`INSERT INTO entries(business_id,type,item,quantity,unit,unit_price_kobo,amount_kobo,payment_method,payment_split,recorded_by,raw_text,source,needs_review,idempotency_key)
  VALUES(${staff.business_id},${entry.type},${entry.item},${entry.quantity},${entry.unit},${entry.unit_price_kobo},${entry.amount_kobo},${entry.payment_method},${JSON.stringify(entry.payment_split)}::jsonb,${staff.id},${entry.raw_text},'text',true,${entry.idempotency_key})
  ON CONFLICT (business_id,idempotency_key) DO NOTHING RETURNING id,created_at`;
  if(result.length){
   const checks=await runChecksSafely((t,p)=>sql.query(t,p),staff.business_id);
   return NextResponse.json({entry_id:result[0].id,created_at:result[0].created_at,saved:true,duplicate:false,needs_review:true,checks},{status:201,headers:noStore});
  }
  const original=await sql`SELECT id,created_at FROM entries WHERE business_id=${staff.business_id} AND idempotency_key=${entry.idempotency_key} LIMIT 1`;
  if(!original.length)return NextResponse.json({error:'Unable to store transaction'},{status:503,headers:noStore});
  return NextResponse.json({entry_id:original[0].id,created_at:original[0].created_at,saved:true,duplicate:true,needs_review:true},{headers:noStore});
 }catch{return NextResponse.json({error:'Unable to store transaction'},{status:503,headers:noStore})}
}
