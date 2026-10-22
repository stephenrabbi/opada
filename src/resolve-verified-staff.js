import {verifyIdentityToken} from './verify-identity-token.js';

// Internal-only bridge between signature-verified identity and a restaurant.
// Not an HTTP route, and does not issue cookies, credentials or sessions.
// Uses the signed token's subject; never accepts a client-provided business ID.
export async function resolveVerifiedStaff({sql,identityToken,verify=verifyIdentityToken}={}){
  if(typeof sql!=='function'||typeof verify!=='function')return null;
  const identity=await verify(identityToken);
  if(!identity||!identity.emailVerified||typeof identity.subject!=='string'||!identity.subject)return null;
  // Prefer fail closed: duplicate active subjects must not grant ambiguous tenancy.
  const rows=await sql`SELECT s.id,s.business_id,s.display_name,s.role FROM staff s
    WHERE s.auth_subject=${identity.subject} AND s.active=true LIMIT 2`;
  if(rows.length!==1)return null;
  const staff=rows[0];
  if(!['owner','manager','staff'].includes(staff.role)||!staff.business_id)return null;
  return {staff,verifiedIdentity:identity};
}
