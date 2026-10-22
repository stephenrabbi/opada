// Pure policy used while designing database redemption. No public redemption API exists.
export function invitationCanBeRedeemed(record,verifiedEmail,now=new Date()){
  if(!record||typeof record!=='object'||!(now instanceof Date)||!Number.isFinite(now.getTime()))return false;
  if(record.consumed_at!=null||record.revoked_at!=null||record.accepted_by!=null)return false;
  if(typeof record.invited_email!=='string'||typeof verifiedEmail!=='string')return false;
  if(record.invited_email!==verifiedEmail.trim().toLowerCase())return false;
  if(!['staff','manager'].includes(record.invited_role))return false;
  const deadline=new Date(record.expires_at);
  return Number.isFinite(deadline.getTime())&&deadline.getTime()>now.getTime();
}
