import {resolveVerifiedStaff} from './resolve-verified-staff.js';
import {createStaffSession} from './session-store.js';

// Internal workflow only. The identity verifier must validate the token's
// signature, trusted issuer/audience and verified email before any DB access.
// This function does not expose public account registration.
export async function beginVerifiedStaffSession({sql,identityToken,verify}={}){
  if(typeof sql!=='function'||typeof identityToken!=='string'||!identityToken)return null;
  const resolved=await resolveVerifiedStaff({sql,identityToken,...(verify?{verify}:{})});
  if(!resolved)return null;
  const created=await createStaffSession({sql,staff:resolved.staff});
  if(!created)return null;
  return {secret:created.secret,expiresAt:created.expiresAt,staff:{id:resolved.staff.id,role:resolved.staff.role}};
}
