import{neon}from'@neondatabase/serverless';import{tokenDigest}from'./token-auth.js';
export async function authorizeStaff(request,roles=['owner','manager','staff']){
 const hash=tokenDigest(request.headers.get('authorization'));
 if(!hash||!process.env.DATABASE_URL)return null;
 const sql=neon(process.env.DATABASE_URL);
 const rows=await sql`SELECT s.id,s.business_id,s.role,s.display_name FROM staff_api_tokens t JOIN staff s ON s.id=t.staff_id WHERE t.token_hash=${hash} AND s.active=true AND t.revoked_at IS NULL AND (t.expires_at IS NULL OR t.expires_at>now()) LIMIT 1`;
 return rows.length&&roles.includes(rows[0].role)?{sql,staff:rows[0]}:null;
}