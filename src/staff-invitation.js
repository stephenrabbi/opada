import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';

export const INVITE_EXPIRY_HOURS=48;
export const INVITABLE_ROLES=Object.freeze(['manager','staff']);

export function validateInvitationInput(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid invitation');
  if(Object.keys(value).some(key=>!['email','role'].includes(key)))throw Error('Unexpected invitation field');
  if(typeof value.email!=='string')throw Error('Invalid email');
  const email=value.email.trim().toLowerCase();
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Invalid email');
  if(!INVITABLE_ROLES.includes(value.role))throw Error('Invalid invitee role');
  return {email,role:value.role};
}

export function canInviteStaff(role){
  return role==='owner';
}

export function generateInvitationSecret(){
  return randomBytes(32).toString('base64url');
}

export function invitationDigest(secret){
  if(typeof secret!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(secret))return null;
  return createHash('sha256').update(secret).digest('hex');
}

export function invitationDigestMatches(provided,expectedDigest){
  const digest=invitationDigest(provided);
  if(!digest||typeof expectedDigest!=='string'||!/^[a-f0-9]{64}$/.test(expectedDigest))return false;
  return timingSafeEqual(Buffer.from(digest,'hex'),Buffer.from(expectedDigest,'hex'));
}

export function invitationExpiry(now=new Date()){
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw Error('Invalid date');
  return new Date(now.getTime()+INVITE_EXPIRY_HOURS*60*60*1000);
}

// These primitives are deliberately NOT connected to an invitation API yet.
// Account creation must atomically enforce single-use, expiry, tenant membership,
// owner authorization, email ownership verification, and audit logging.
