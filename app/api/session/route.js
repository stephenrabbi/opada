import {NextResponse} from 'next/server';
import {neon} from '@neondatabase/serverless';
import {resolveRequestSession} from '../../../src/session-request.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(request){
 // Disabled until staff_sessions is migrated in the intended environment,
 // trusted identity login is integrated and an authorized rollout is approved.
 if(process.env.OPADA_SESSION_READ_ENABLED!=='true')return NextResponse.json({error:'Unavailable'},{status:404,headers});
 if(!process.env.DATABASE_URL)return NextResponse.json({error:'Service unavailable'},{status:503,headers});
 try{
  const staff=await resolveRequestSession({request,sql:neon(process.env.DATABASE_URL)});
  if(!staff)return NextResponse.json({authenticated:false},{status:401,headers});
  return NextResponse.json({authenticated:true,staff:{id:staff.staff_id,name:staff.display_name,role:staff.role},restaurant:{id:staff.business_id}},{headers});
 }catch{return NextResponse.json({error:'Service unavailable'},{status:503,headers})}
}
