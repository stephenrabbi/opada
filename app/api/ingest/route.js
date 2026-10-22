import {NextResponse} from 'next/server';
import {authorizeStaff} from '../../../src/staff-auth.js';
import {validateEntry} from '../../../src/ingest-schema.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const noStore={'Cache-Control':'private, no-store'};

export async function POST(request){
  let auth;
  try {
    auth=await authorizeStaff(request,['owner','manager','staff']);
  } catch {
    return NextResponse.json({error:'Authentication unavailable'},{status:503,headers:noStore});
  }
  if(!auth)return NextResponse.json({error:'Unauthorized'},{status:401,headers:noStore});

  let entry;
  try {
    entry=validateEntry(await request.json());
  } catch {
    return NextResponse.json({error:'Invalid transaction fields'},{status:422,headers:noStore});
  }

  try {
    // business_id and actor id come only from the authenticated server-side token lookup.
    // Never accept a client-provided restaurant, staff id, or verified payment status.
    const actor=auth.staff;
    const result=await auth.sql`INSERT INTO entries(business_id,type,item,quantity,unit,unit_price_kobo,amount_kobo,payment_method,payment_split,recorded_by,raw_text,source,needs_review) VALUES(${actor.business_id},${entry.type},${entry.item},${entry.quantity},${entry.unit},${entry.unit_price_kobo},${entry.amount_kobo},${entry.payment_method},${JSON.stringify(entry.payment_split)}::jsonb,${actor.id},${entry.raw_text},'text',true) RETURNING id,created_at`;
    return NextResponse.json({entry_id:result[0].id,created_at:result[0].created_at,saved:true,needs_review:true,processing:'not_enabled'},{status:201,headers:noStore});
  } catch {
    return NextResponse.json({error:'Unable to store transaction'},{status:503,headers:noStore});
  }
}
