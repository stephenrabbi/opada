import {NextResponse} from 'next/server';
import {authorizeStaff} from '../../../../src/staff-auth.js';
import {verifyTestTransaction} from '../../../../src/paystack.js';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request){
 let auth;try{auth=await authorizeStaff(request,['owner','manager'])}catch{return NextResponse.json({error:'Authentication unavailable'},{status:503})}
 if(!auth)return NextResponse.json({error:'Unauthorized'},{status:401});
 const secret=process.env.PAYSTACK_TEST_SECRET_KEY;
 if(!secret?.startsWith('sk_test_'))return NextResponse.json({error:'Test payments not configured'},{status:503});
 let body;try{body=await request.json()}catch{return NextResponse.json({error:'Invalid request'},{status:400})}
 if(!body||Object.keys(body).join(',')!=='reference'||typeof body.reference!=='string'||!/^opada_test_[a-f0-9]{24}$/.test(body.reference))return NextResponse.json({error:'Invalid reference'},{status:422});
 try{
 const sql=auth.sql;
 const matched=await sql`SELECT r.reference,r.expected_amount_kobo FROM paystack_expected_references r JOIN businesses b ON b.id=r.business_id WHERE r.reference=${body.reference} AND r.business_id=${auth.staff.business_id} AND b.name LIKE 'OPADA SYNTHETIC%' LIMIT 1`;
 if(!matched.length)return NextResponse.json({error:'Unknown synthetic payment'},{status:404});
 const verified=await verifyTestTransaction(body.reference,secret);
 if(verified.amount!==Number(matched[0].expected_amount_kobo))return NextResponse.json({error:'Amount mismatch'},{status:422});
 const saved=await sql`INSERT INTO payments(business_id,paystack_reference,amount_kobo,channel,paid_at) VALUES(${auth.staff.business_id},${body.reference},${verified.amount},${verified.channel||'unknown'},${verified.paid_at}::timestamptz) ON CONFLICT(paystack_reference) DO NOTHING RETURNING id`;
 return NextResponse.json({verified:true,mode:'test',recorded:saved.length===1,already_recorded:saved.length===0,amount_kobo:verified.amount},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Verification unavailable',code:'PAYSTACK_RECONCILIATION_FAILED'},{status:503})}
}
