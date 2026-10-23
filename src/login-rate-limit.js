// Atomic, database-backed limiter shared by all server instances.
// Fail closed if the database is unavailable. This is a global safety ceiling;
// apply trusted-edge per-IP controls before enabling sign-in.
export const LOGIN_MAX_ATTEMPTS_PER_MINUTE=120;
export async function reserveLoginAttempt({sql,now=new Date()}={}){
 if(typeof sql!=='function'||!(now instanceof Date)||!Number.isFinite(now.getTime()))return false;
 const bucket=new Date(Math.floor(now.getTime()/60000)*60000).toISOString();
 const rows=await sql`INSERT INTO login_attempt_buckets(bucket_start,attempts)
 VALUES(${bucket}::timestamptz,1)
 ON CONFLICT(bucket_start) DO UPDATE
 SET attempts=login_attempt_buckets.attempts+1
 WHERE login_attempt_buckets.attempts<${LOGIN_MAX_ATTEMPTS_PER_MINUTE}
 RETURNING attempts`;
 return rows.length===1;
}
