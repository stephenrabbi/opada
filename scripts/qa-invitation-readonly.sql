-- Opada invitation schema verification (READ-ONLY).
-- Run on an isolated QA branch AFTER applying the migration.
-- This script does not create invitations, activate accounts, or mutate data.
-- Project falling-rice-41327078; QA branch br-steep-resonance-zaz6fqg3.
SELECT to_regclass('public.staff_invitations') AS invitation_table;
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'public.staff_invitations'::regclass
  AND conname IN (
    'staff_inviter_tenant_fk',
    'staff_acceptor_tenant_fk',
    'staff_invitation_state_check',
    'staff_invitation_time_check',
    'staff_invitations_token_digest_key'
  )
ORDER BY conname;
SELECT count(*) AS stored_invitation_count FROM public.staff_invitations;
-- EXPLAIN, not EXPLAIN ANALYZE, validates SQL parsing/planning without execution.
EXPLAIN UPDATE public.staff_invitations AS inv
SET consumed_at = now(), accepted_by = recipient.id
FROM public.staff AS recipient
WHERE inv.token_digest = repeat('a',64)
  AND inv.invited_email = 'synthetic@example.invalid'
  AND inv.expires_at > now()
  AND inv.consumed_at IS NULL
  AND inv.revoked_at IS NULL
  AND inv.accepted_by IS NULL
  AND recipient.business_id = inv.business_id
  AND recipient.auth_subject = 'synthetic-subject'
  AND recipient.active = true
  AND recipient.role = inv.invited_role;
