import{NextResponse}from'next/server';import{neon}from'@neondatabase/serverless';import{verifyPaystackSignature,validPaystackEvent,verifyTestTransaction}from'../../../../src/paystack.js';export const runtime='nodejs';export async function POST(request){
 const secret=process.env.PAYSTACK_TEST_SECRET_KEY;
 if(!secret?.startsWith('sk_test_')||!process.env.DATABASE_URL)return NextResponse.json({error:'Test webhook not configured'},{status:503});
 const raw=await request.text();if(raw.length>100000)return NextResponse.json({error:'Payload too large'},{status:413});
 if(!verifyPaystackSignature(raw,request.headers.get('x-paystack-signature'),secret))return NextResponse.json({error:'Invalid signature'},{status:401});
 let event;try{event=JSON.parse(raw)}catch{return NextResponse.json({error:'Invalid JSON'},{status:400})}
 if(event?.event!=='charge.success')return NextResponse.json({acknowledged:true,ignored:true});
 if(!validPaystackEvent(event))return NextResponse.json({error:'Unsupported or invalid test payment'},{status:422});
 const ref=event.data.reference;
 try{
 const data=await verifyTestTransaction(ref,secret);
 if(data.amount!==event.data.amount)return NextResponse.json({error:'Verification amount mismatch'},{status:422});
 const sql=neon(process.env.DATABASE_URL);
 const expectation=await sql`SELECT business_id,expected_amount_kobo FROM paystack_expected_references WHERE reference=${ref} LIMIT 1`;
 if(!expectation.length)return NextResponse.json({error:'Unknown mapped transaction'},{status:422});
 if(Number(expectation[0].expected_amount_kobo)!==data.amount)return NextResponse.json({error:'Expected amount mismatch'},{status:422});
 const saved=await sql`INSERT INTO payments(business_id,paystack_reference,amount_kobo,channel,paid_at) VALUES(${expectation[0].business_id},${ref},${data.amount},${data.channel||'unknown'},${data.paid_at}::timestamptz) ON CONFLICT(paystack_reference) DO NOTHING RETURNING id`;
 return NextResponse.json({acknowledged:true,recorded:saved.length===1});
 }catch{return NextResponse.json({error:'Verification or persistence unavailable'},{status:503})}
}