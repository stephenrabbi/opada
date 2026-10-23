import {NextResponse} from 'next/server';
import {authorizeStaff} from '../../../../src/staff-auth.js';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request){
 let auth;try{auth=await authorizeStaff(request,['owner','manager'])}catch{return NextResponse.json({error:'Authentication unavailable'},{status:503})}
 if(!auth)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
 const rows=await auth.sql`SELECT paystack_reference,amount_kobo,channel,paid_at FROM payments WHERE business_id=${auth.staff.business_id} ORDER BY paid_at DESC LIMIT 50`;
 return NextResponse.json({mode:'verified_paystack_receipts',receipts:rows},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Receipts temporarily unavailable'},{status:503})}
}
