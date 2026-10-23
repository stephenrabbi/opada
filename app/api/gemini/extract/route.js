import{NextResponse}from'next/server';import{neon}from'@neondatabase/serverless';import{tokenDigest}from'../../../../src/token-auth.js';import{extractWithGemini}from'../../../../src/gemini-extract.js';import{reserveGeminiCall,GeminiCapReachedError}from'../../../../src/gemini-budget.js';export const runtime='nodejs';export async function POST(req){
 const hash=tokenDigest(req.headers.get('authorization'));if(!hash)return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!process.env.GEMINI_API_KEY||!process.env.DATABASE_URL)return NextResponse.json({error:'Gemini or database not configured'},{status:503});
 let body;try{body=await req.json()}catch{return NextResponse.json({error:'Invalid JSON'},{status:400})}
 if(!body||Object.keys(body).sort().join(',')!=='text'||typeof body.text!=='string'||!body.text.trim()||body.text.length>4000)return NextResponse.json({error:'Invalid text'},{status:422});
 try{
 const sql=neon(process.env.DATABASE_URL);
 const staff=await sql`SELECT s.id FROM staff_api_tokens t JOIN staff s ON s.id=t.staff_id WHERE t.token_hash=${hash} AND t.revoked_at IS NULL AND (t.expires_at IS NULL OR t.expires_at>now()) AND s.active LIMIT 1`;
 if(!staff.length)return NextResponse.json({error:'Unauthorized'},{status:401});
 await reserveGeminiCall((text,params)=>sql.query(text,params));
 const extracted=await extractWithGemini(body.text,process.env.GEMINI_API_KEY);
 return NextResponse.json({mode:'review_required',persisted:false,raw_text:body.text,...extracted});
 }catch(e){
  if(e instanceof GeminiCapReachedError)return NextResponse.json({error:e.message,code:'GEMINI_DAILY_CAP_REACHED',cap:e.cap},{status:429});
  return NextResponse.json({error:'Extraction unavailable'},{status:503})}
}