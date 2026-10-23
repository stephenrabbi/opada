import {NextResponse} from 'next/server';
import {neon} from '@neondatabase/serverless';
import {resolveRequestSession} from '../../../../src/session-request.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};

// Expose only a minimal staff profile; the business scope comes from the
// database-backed session, never from query parameters or request headers.
export async function GET(request){
 if(process.env.OPADA_SESSION_READ_ENABLED!=='true')return NextResponse.json({error:'Unavailable'},{status:404,headers});
 if(!process.env.DATABASE_URL)return NextResponse.json({error:'Service unavailable'},{status:503,headers});
 try{
  const session=await resolveRequestSession({request,sql:neon(process.env.DATABASE_URL)});
  if(!session)return NextResponse.json({authenticated:false},{status:401,headers});
  return NextResponse.json({authenticated:true,staff:{id:session.staff_id,display_name:session.display_name,role:session.role,business_id:session.business_id}},{headers});
 }catch{return NextResponse.json({error:'Service unavailable'},{status:503,headers})}
}
