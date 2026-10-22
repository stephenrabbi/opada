import {resolveVerifiedStaff} from './resolve-verified-staff.js';
import {createStaffSession} from './session-store.js';
import {sessionCookie} from './session-policy.js';

// Server-only orchestration. Caller must enforce rate limiting, browser CSRF
// controls, a trusted identity-provider exchange and authorization to sign in.
// Never accept restaurant or staff IDs from a browser to issue a session.
// Return cookie material ONLY after a durable database session insert succeeds.
export async function issueVerifiedStaffSession({
  sql, identityToken, verify, now = new Date()
} = {}) {
  if (typeof sql !== 'function' || typeof identityToken !== 'string' ||
      identityToken.length === 0 || !(now instanceof Date) ||
      !Number.isFinite(now.getTime())) return null;
  const resolved = await resolveVerifiedStaff({
    sql, identityToken, ...(verify === undefined ? {} : {verify})
  });
  if (!resolved) return null;
  const created = await createStaffSession({sql, staff: resolved.staff, now});
  if (!created) return null;
  return {
    cookie: sessionCookie(created.secret),
    expiresAt: created.expiresAt,
    // No plaintext session secret, provider subject, or restaurant selector
    // should be serialized to a browser response.
    staff: {
      id: resolved.staff.id,
      business_id: resolved.staff.business_id,
      role: resolved.staff.role,
      display_name: resolved.staff.display_name
    }
  };
}
