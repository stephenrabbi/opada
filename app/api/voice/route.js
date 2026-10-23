import {NextResponse} from 'next/server';
import {authorizeStaff} from '../../../src/staff-auth.js';
import {GoogleAuth} from 'google-auth-library';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const supported={'en-NG':'chirp_2','yo-NG':'chirp_2','ig-NG':'chirp_2','ha-NG':'chirp_2'};

const wifConfig=()=>({
 number:process.env.GOOGLE_CLOUD_PROJECT_NUMBER,
 pool:process.env.GOOGLE_WIF_POOL_ID||'vercel',
 provider:process.env.GOOGLE_WIF_PROVIDER_ID||'vercel',
 serviceAccount:process.env.GOOGLE_SPEECH_SERVICE_ACCOUNT
});
function hasWifConfig(){
 const {number,pool,provider,serviceAccount}=wifConfig();
 return /^\d{6,20}$/.test(number||'')&&/^[a-z][a-z0-9-]{2,31}$/.test(pool)&&/^[a-z][a-z0-9-]{2,31}$/.test(provider)&&/^[a-zA-Z0-9._-]+@[a-z][a-z0-9-]+\.iam\.gserviceaccount\.com$/.test(serviceAccount||'');
}
async function speechAuthHeaders(request){
 if(process.env.GOOGLE_AUTH_MODE!=='vercel-wif'){
  const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']});
  return Object.fromEntries(await auth.getRequestHeaders());
 }
 if(!hasWifConfig())throw Error('Speech identity is not configured');
 // Vercel injects this header into runtime function requests when OIDC is enabled.
 // Never forward user-provided bearer tokens to Google without Google's own STS validation.
 const subjectToken=request.headers.get('x-vercel-oidc-token');
 if(!subjectToken)throw Error('Vercel identity token unavailable');
 const {number,pool,provider,serviceAccount}=wifConfig();
 const audience=`//iam.googleapis.com/projects/${number}/locations/global/workloadIdentityPools/${pool}/providers/${provider}`;
 const tokenRes=await fetch('https://sts.googleapis.com/v1/token',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({audience,grantType:'urn:ietf:params:oauth:grant-type:token-exchange',requestedTokenType:'urn:ietf:params:oauth:token-type:access_token',scope:'https://www.googleapis.com/auth/cloud-platform',subjectTokenType:'urn:ietf:params:oauth:token-type:jwt',subjectToken}),
  signal:AbortSignal.timeout(12000)
 });
 if(!tokenRes.ok)throw Error('Federated token exchange failed');
 const exchange=await tokenRes.json();
 if(typeof exchange.access_token!=='string')throw Error('Federated access token absent');
 const iamRes=await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(serviceAccount)}:generateAccessToken`,{
  method:'POST',headers:{Authorization:`Bearer ${exchange.access_token}`,'Content-Type':'application/json'},
  body:JSON.stringify({scope:['https://www.googleapis.com/auth/cloud-platform'],lifetime:'900s'}),
  signal:AbortSignal.timeout(12000)
 });
 if(!iamRes.ok)throw Error('Service account impersonation failed');
 const credentials=await iamRes.json();
 if(typeof credentials.accessToken!=='string')throw Error('Service account token absent');
 return {Authorization:`Bearer ${credentials.accessToken}`};
}
function reply(data,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})}
export async function GET(){return reply({provider:'google-cloud-speech-v2',enabled:process.env.OPADA_GOOGLE_STT_ENABLED==='true'&&Boolean(process.env.GOOGLE_CLOUD_PROJECT_ID)&&(process.env.GOOGLE_AUTH_MODE!=='vercel-wif'||hasWifConfig()),supportedLanguages:Object.keys(supported),pidginDedicated:false,billingRequired:true})}
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
  const headers=await speechAuthHeaders(request);
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
