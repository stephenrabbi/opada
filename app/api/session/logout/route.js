import {NextResponse} from 'next/server';
import {neon} from '@neondatabase/serverless';
import {sessionSecretFromCookie} from '../../../../src/session-request.js';
import {expiredSessionCookie} from '../../../../src/session-policy.js';
import {revokeStaffSession} from '../../../../src/session-store.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
function response(status=204){
 return new Response(null,{status,headers:{...headers,'Set-Cookie':expiredSessionCookie()}});
}
export function originIsAllowed(request){
 const origin=request.headers.get('origin');
 const url=new URL(request.url);
 // Explicit origin check protects cookie-authenticated state changes.
 // Missing Origin is rejected; do not infer trust from client-controlled Host.
 return !!origin && origin===url.origin && url.protocol==='https:';
}
export async function POST(request){
 if(process.env.OPADA_SESSION_READ_ENABLED!=='true')return NextResponse.json({error:'Unavailable'},{status:404,headers});
 if(!originIsAllowed(request))return NextResponse.json({error:'Forbidden origin'},{status:403,headers});
 const secret=sessionSecretFromCookie(request.headers.get('cookie'));
 if(!secret)return response();
 if(!process.env.DATABASE_URL)return NextResponse.json({error:'Service unavailable'},{status:503,headers});
 try{
  await revokeStaffSession({sql:neon(process.env.DATABASE_URL),secret});
  return response();
 }catch{return NextResponse.json({error:'Service unavailable'},{status:503,headers})}
}
