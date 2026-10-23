import {canInviteStaff,generateInvitationSecret,invitationDigest,invitationExpiry,validateInvitationInput} from './staff-invitation.js';
import {teamScope} from './team-access.js';

// Internal only: not registered as an HTTP endpoint, and does not send emails.
// Supply an authenticated staff identity from authorizeStaff, never client JSON.
export async function prepareStaffInvitation({sql,auth,input,now=new Date()}={}){
  if(typeof sql!=='function')throw Error('Database adapter required');
  const businessId=teamScope(auth);
  if(!businessId||!canInviteStaff(auth.staff.role))return {created:false};
  const {email,role}=validateInvitationInput(input);
  const secret=generateInvitationSecret();
  const digest=invitationDigest(secret);
  const expiry=invitationExpiry(now);
  // The owner and business scope are derived from the authenticated session.
  // Database composite FK prevents a foreign tenant inviter.
  const result=await sql`
    INSERT INTO staff_invitations
      (business_id,invited_by,invited_email,invited_role,token_digest,expires_at)
    VALUES
      (${businessId},${auth.staff.id},${email},${role},${digest},${expiry.toISOString()}::timestamptz)
    RETURNING id,expires_at
  `;
  if(result.length!==1)return {created:false};
  // Secret must only be sent to intended recipient through approved secure
  // delivery. It must never be logged, persisted unhashed or exposed in a URL
  // prior to email verification, CSRF, anti-abuse and audit controls.
  return {created:true,invitationId:result[0].id,secret,expiresAt:result[0].expires_at};
}
