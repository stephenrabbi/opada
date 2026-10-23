-- Internal staff invitations: no public invitation endpoints are enabled.
-- Depends on 0006_identity_sessions (staff_id_business_id_unique).
CREATE TABLE IF NOT EXISTS staff_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES businesses(id),
 invited_by uuid NOT NULL,
 invited_email text NOT NULL,
 invited_role text NOT NULL CHECK (invited_role IN ('manager','staff')),
 token_digest char(64) NOT NULL UNIQUE CHECK (token_digest ~ '^[0-9a-f]{64}$'),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 consumed_at timestamptz,
 revoked_at timestamptz,
 accepted_by uuid,
 CONSTRAINT staff_invitation_email_check CHECK (
   length(invited_email) BETWEEN 3 AND 254
   AND invited_email=lower(btrim(invited_email))
   AND invited_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
 CONSTRAINT staff_invitation_time_check CHECK (expires_at>created_at),
 CONSTRAINT staff_invitation_state_check CHECK (
   (consumed_at IS NULL AND accepted_by IS NULL)
   OR (consumed_at IS NOT NULL AND accepted_by IS NOT NULL AND revoked_at IS NULL)),
 CONSTRAINT staff_inviter_tenant_fk FOREIGN KEY(invited_by,business_id)
  REFERENCES staff(id,business_id),
 CONSTRAINT staff_acceptor_tenant_fk FOREIGN KEY(accepted_by,business_id)
  REFERENCES staff(id,business_id)
);
CREATE INDEX IF NOT EXISTS staff_invitations_business_idx
 ON staff_invitations(business_id,created_at DESC);
CREATE INDEX IF NOT EXISTS staff_invitations_pending_idx
 ON staff_invitations(business_id,expires_at)
 WHERE consumed_at IS NULL AND revoked_at IS NULL;
