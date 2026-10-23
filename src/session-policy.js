import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';

export const SESSION_MAX_AGE_SECONDS=8*60*60;
export const SESSION_COOKIE_NAME='__Host-opada_session';

export function newSessionSecret(){return randomBytes(32).toString('base64url')}
export function sessionDigest(secret){
 if(typeof secret!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(secret))return null;
 return createHash('sha256').update(secret).digest('hex');
}
export function sessionDigestMatches(secret,storedHash){
 const hash=sessionDigest(secret);
 if(!hash||typeof storedHash!=='string'||!/^[a-f0-9]{64}$/.test(storedHash))return false;
 return timingSafeEqual(Buffer.from(hash,'hex'),Buffer.from(storedHash,'hex'));
}
export function sessionCookie(secret,{maxAge=SESSION_MAX_AGE_SECONDS}={}){
 if(!sessionDigest(secret)||!Number.isSafeInteger(maxAge)||maxAge<1||maxAge>SESSION_MAX_AGE_SECONDS)throw Error('Invalid session cookie');
 return SESSION_COOKIE_NAME+'='+secret+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+maxAge;
}
export function expiredSessionCookie(){return SESSION_COOKIE_NAME+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'}
export function sessionIsValid(record,{now=new Date(),staffId,businessId}={}){
 if(!record||record.revoked_at!=null||!staffId||!businessId||record.staff_id!==staffId||record.business_id!==businessId||record.staff_active!==true)return false;
 const expires=new Date(record.expires_at);
 return Number.isFinite(expires.getTime())&&expires.getTime()>now.getTime()&&Number.isFinite(now.getTime());
}
// Not wired to public login. A verified identity + tenant membership must
// precede issuance. Persist hashes only, enforce server-side expiry/revocation.
