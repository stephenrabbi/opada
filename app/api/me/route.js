import {NextResponse} from 'next/server';
import {authorizeStaff} from '../../../src/staff-auth.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
 try{
  const auth=await authorizeStaff(request);
  if(!auth)return NextResponse.json({error:'Unauthorized'},{status:401,headers:{'Cache-Control':'no-store'}});
  const businesses=await auth.sql`SELECT id,name,timezone FROM businesses WHERE id=${auth.staff.business_id} LIMIT 1`;
  if(!businesses.length)return NextResponse.json({error:'Restaurant not found'},{status:404});
  return NextResponse.json({staff:{id:auth.staff.id,name:auth.staff.display_name,role:auth.staff.role},restaurant:businesses[0]},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Service unavailable'},{status:503})}
}