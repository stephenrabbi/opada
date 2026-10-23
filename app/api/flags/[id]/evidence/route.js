import {NextResponse} from 'next/server';
import {authorizeStaff} from '../../../../../src/staff-auth.js';
import {loadFlagEvidence} from '../../../../../src/evidence.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function reply(data,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}})}
export async function GET(request,{params}){
 let auth;try{auth=await authorizeStaff(request,['owner','manager'])}catch{return reply({error:'Authentication unavailable'},503)}
 if(!auth)return reply({error:'Unauthorized'},401);
 const {id}=await params;
 if(typeof id!=='string'||!uuid.test(id))return reply({error:'Invalid flag ID'},422);
 try{
  const evidence=await loadFlagEvidence((text,values)=>auth.sql.query(text,values),auth.staff.business_id,id.toLowerCase());
  // Another business's flag looks exactly like a missing one.
  if(!evidence)return reply({error:'Not found'},404);
  return reply(evidence);
 }catch{return reply({error:'Evidence temporarily unavailable'},503)}
}
