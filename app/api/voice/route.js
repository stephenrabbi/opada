import {NextResponse} from 'next/server';
import {authorizeStaff} from '../../../src/staff-auth.js';
import {GoogleAuth} from 'google-auth-library';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const supported={'en-NG':'chirp_2','yo-NG':'chirp_2','ig-NG':'chirp_2','ha-NG':'chirp_2'};
function reply(data,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})}
export async function GET(){return reply({provider:'google-cloud-speech-v2',enabled:process.env.OPADA_GOOGLE_STT_ENABLED==='true'&&Boolean(process.env.GOOGLE_CLOUD_PROJECT_ID),supportedLanguages:Object.keys(supported),pidginDedicated:false,billingRequired:true})}
export async function POST(request){
 if(process.env.OPADA_GOOGLE_STT_ENABLED!=='true')return reply({error:'Google Cloud transcription has not been enabled. Use browser recognition or type instead.'},503);
 const project=process.env.GOOGLE_CLOUD_PROJECT_ID;
 const location=process.env.GOOGLE_STT_LOCATION||'us-central1';
 if(!project||!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(project)||!['us-central1','asia-southeast1'].includes(location))return reply({error:'Google Cloud transcription is not configured.'},503);
 try{
  const auth=await authorizeStaff(request);
  if(!auth)return reply({error:'Unauthorized'},401);
  const length=Number(request.headers.get('content-length')||0);
  if(length>1024*1024)return reply({error:'Audio must be under 1 MB.'},413);
  const form=await request.formData(),audio=form.get('audio'),language=form.get('language');
  if(typeof language!=='string'||!Object.hasOwn(supported,language))return reply({error:'Language not supported by configured Google service. Pidgin does not have a dedicated Google STT model.'},400);
  if(!(audio instanceof Blob)||audio.size<100||audio.size>1024*1024)return reply({error:'Audio must be between 100 bytes and 1 MB.'},400);
  if(!['audio/webm','audio/ogg','audio/mp4'].some(m=>audio.type.startsWith(m)))return reply({error:'Unsupported audio format.'},415);
  const bytes=Buffer.from(await audio.arrayBuffer());
  const client=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']});
  const headers=await client.getRequestHeaders();
  const googleResponse=await fetch('https://speech.googleapis.com/v2/projects/'+encodeURIComponent(project)+'/locations/'+location+'/recognizers/_:recognize',{
   method:'POST',headers:{...Object.fromEntries(headers),'Content-Type':'application/json'},
   body:JSON.stringify({config:{autoDecodingConfig:{},languageCodes:[language],model:supported[language]},content:bytes.toString('base64')}),
   signal:AbortSignal.timeout(25000)
  });
  if(!googleResponse.ok)return reply({error:'Google transcription service unavailable or the audio format/model was rejected.',providerStatus:googleResponse.status},502);
  const result=await googleResponse.json();
  const transcript=(result.results||[]).map(r=>r.alternatives?.[0]?.transcript||'').join(' ').trim();
  if(!transcript)return reply({error:'No speech recognized. Please try again or type your report.'},422);
  return reply({transcript,language,provider:'google-cloud-speech-v2',verified:false});
 }catch{return reply({error:'Transcription failed. Try browser recognition or typed reporting.'},503)}
}
