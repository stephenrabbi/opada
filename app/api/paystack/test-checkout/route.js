import {NextResponse} from 'next/server';
import {authorizeStaff} from '../../../../src/staff-auth.js';
import {checkoutReference,validateTestCheckout,initializeTestPayment} from '../../../../src/paystack-checkout.js';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request){
 const secret=process.env.PAYSTACK_TEST_SECRET_KEY;
 if(!secret?.startsWith('sk_test_'))return NextResponse.json({error:'Test mode unavailable'},{status:503});
 let auth;try{auth=await authorizeStaff(request,['owner','manager'])}catch{return NextResponse.json({error:'Authentication service unavailable'},{status:503})}
 if(!auth)return NextResponse.json({error:'Unauthorized'},{status:401});
 let body;try{body=validateTestCheckout(await request.json())}catch{return NextResponse.json({error:'Invalid test checkout request'},{status:422})}
 try{
 const business=await auth.sql`SELECT name FROM businesses WHERE id=${auth.staff.business_id} LIMIT 1`;
 if(!business.length||!business[0].name.startsWith('OPADA SYNTHETIC'))return NextResponse.json({error:'Test checkout restricted to synthetic business'},{status:403});
 const reference=checkoutReference();
 await auth.sql`INSERT INTO paystack_expected_references(reference,business_id,expected_amount_kobo,currency) VALUES (${reference},${auth.staff.business_id},${body.amount_kobo},'NGN')`;
 const checkout=await initializeTestPayment({...body,reference},secret);
 return NextResponse.json({mode:'test',...checkout},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Could not initialize test checkout'},{status:503})}
}
