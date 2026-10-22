import {invitationDigest} from './staff-invitation.js';

// Internal primitive only; no HTTP route uses it.
// verifiedIdentity MUST be obtained from a trusted server-verified provider,
// not client JSON or arbitrary headers. A matching staff account must exist.
export async function redeemExistingStaffInvitation({sql,secret,verifiedIdentity,now=new Date()}={}){
  if(typeof sql!=='function')throw Error('Database adapter required');
  const digest=invitationDigest(secret);
  if(!digest)return {redeemed:false};
  if(!verifiedIdentity||verifiedIdentity.emailVerified!==true||
      typeof verifiedIdentity.subject!=='string'||!verifiedIdentity.subject||
      typeof verifiedIdentity.email!=='string'||!(now instanceof Date)||
      !Number.isFinite(now.getTime()))return {redeemed:false};
  const email=verifiedIdentity.email.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {redeemed:false};

  // Atomic conditional update prevents consuming the same invitation twice.
  // Cross-tenant acceptance is also disallowed by composite FK constraints.
  const rows=await sql`
    UPDATE staff_invitations AS inv
    SET consumed_at=${now.toISOString()},accepted_by=recipient.id
    FROM staff AS recipient
    WHERE inv.token_digest=${digest}
      AND inv.invited_email=${email}
      AND inv.expires_at>${now.toISOString()}::timestamptz
      AND inv.consumed_at IS NULL
      AND inv.revoked_at IS NULL
      AND inv.accepted_by IS NULL
      AND recipient.business_id=inv.business_id
      AND recipient.auth_subject=${verifiedIdentity.subject}
      AND recipient.active=true
      AND recipient.role=inv.invited_role
    RETURNING inv.id,inv.business_id,inv.accepted_by
  `;
  return rows.length===1?{redeemed:true,invitationId:rows[0].id,businessId:rows[0].business_id}:{redeemed:false};
}
