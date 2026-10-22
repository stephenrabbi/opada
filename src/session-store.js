import {newSessionSecret,sessionDigest,SESSION_MAX_AGE_SECONDS} from './session-policy.js';

// Internal server-side helpers only. Do not expose session creation publicly.
// Caller MUST authenticate the identity provider and resolve a unique active staff member first.
export async function createStaffSession({sql,staff,now=new Date()}={}){
 if(typeof sql!=='function'||!staff?.id||!staff?.business_id||!(now instanceof Date)||!Number.isFinite(now.getTime()))return null;
 const secret=newSessionSecret();
 const digest=sessionDigest(secret);
 const expires=new Date(now.getTime()+SESSION_MAX_AGE_SECONDS*1000);
 const rows=await sql`INSERT INTO staff_sessions(staff_id,business_id,token_digest,created_at,expires_at)
 SELECT s.id,s.business_id,${digest},${now.toISOString()}::timestamptz,${expires.toISOString()}::timestamptz
 FROM staff s WHERE s.id=${staff.id} AND s.business_id=${staff.business_id} AND s.active=true
 RETURNING id,expires_at`;
 return rows.length===1?{secret,sessionId:rows[0].id,expiresAt:rows[0].expires_at}:null;
}
export async function revokeStaffSession({sql,secret}={}){
 const digest=sessionDigest(secret);
 if(typeof sql!=='function'||!digest)return false;
 const rows=await sql`UPDATE staff_sessions SET revoked_at=now()
 WHERE token_digest=${digest} AND revoked_at IS NULL RETURNING id`;
 return rows.length===1;
}
export async function findActiveStaffSession({sql,secret,now=new Date()}={}){
 const digest=sessionDigest(secret);
 if(typeof sql!=='function'||!digest||!(now instanceof Date)||!Number.isFinite(now.getTime()))return null;
 const rows=await sql`SELECT s.id AS staff_id,s.business_id,s.role,s.display_name
 FROM staff_sessions ss JOIN staff s ON s.id=ss.staff_id AND s.business_id=ss.business_id
 WHERE ss.token_digest=${digest} AND ss.revoked_at IS NULL AND ss.expires_at>${now.toISOString()}::timestamptz AND s.active=true LIMIT 2`;
 return rows.length===1&&['owner','manager','staff'].includes(rows[0].role)?rows[0]:null;
}
