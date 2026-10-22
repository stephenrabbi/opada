import {NextResponse} from 'next/server';
import {neon} from '@neondatabase/serverless';
import {beginVerifiedStaffSession} from '../../../../src/login-flow.js';
import {sessionCookie} from '../../../../src/session-policy.js';
import {originIsAllowed} from '../../../../src/session-origin.js';
import {identityProviderConfig} from '../../../../src/verify-identity-token.js';
import {loginFeatureEnabled,validateLoginPayload} from '../../../../src/login-policy.js';
import {reserveLoginAttempt} from '../../../../src/login-rate-limit.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function POST(request){
  if(!loginFeatureEnabled()||!identityProviderConfig())return NextResponse.json({error:'Unavailable'},{status:404,headers});
  if(!originIsAllowed(request))return NextResponse.json({error:'Forbidden origin'},{status:403,headers});
  if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))return NextResponse.json({error:'Invalid content type'},{status:415,headers});
  const length=Number(request.headers.get('content-length')||0);
  if(length>16000)return NextResponse.json({error:'Request too large'},{status:413,headers});
  // Enforce the limit on received bytes even if Content-Length is absent or false.
  let payload;
  try{
    if(!request.body)return NextResponse.json({error:'Invalid request'},{status:400,headers});
    const reader=request.body.getReader();
    const chunks=[];let size=0;
    try{
      for(;;){
        const {done,value}=await reader.read();
        if(done)break;
        size+=value.byteLength;
        if(size>16000)return NextResponse.json({error:'Request too large'},{status:413,headers});
        chunks.push(value);
      }
    }finally{reader.releaseLock()}
    const bytes=new Uint8Array(size);let cursor=0;
    for(const chunk of chunks){bytes.set(chunk,cursor);cursor+=chunk.byteLength}
    payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  }catch{return NextResponse.json({error:'Invalid request'},{status:400,headers})}
  const identityToken=validateLoginPayload(payload);
  if(!identityToken)return NextResponse.json({error:'Invalid request'},{status:400,headers});
  try{
    const sql=neon(process.env.DATABASE_URL);
    const permitted=await reserveLoginAttempt({sql});
    if(!permitted)return NextResponse.json({error:'Too many sign-in requests'},{status:429,headers:{...headers,'Retry-After':'60'}});
    const session=await beginVerifiedStaffSession({sql,identityToken});
    if(!session)return NextResponse.json({error:'Not authorized'},{status:401,headers});
    return NextResponse.json({authenticated:true,staff:session.staff},{headers:{...headers,'Set-Cookie':sessionCookie(session.secret)}});
  }catch{return NextResponse.json({error:'Sign-in unavailable'},{status:503,headers})}
}
// IMPORTANT: do not enable without independent review of rate limiting,
// email verification, session fixation/replay protections and rollout controls.
