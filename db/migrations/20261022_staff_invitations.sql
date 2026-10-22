-- OPADA DEVELOPMENT MIGRATION: Do not apply to production without review.
-- Invitations intentionally have NO enabled HTTP routes.
-- A verified identity provider must authenticate invitee email before redemption.
BEGIN;
CREATE TABLE IF NOT EXISTS staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id),
  invited_by uuid NOT NULL REFERENCES staff(id),
  invited_email text NOT NULL,
  invited_role text NOT NULL CHECK (invited_role IN ('manager','staff')),
  token_digest char(64) NOT NULL UNIQUE CHECK (token_digest ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  revoked_at timestamptz,
  accepted_by uuid REFERENCES staff(id),
  CONSTRAINT staff_invitation_email_check CHECK (
    length(invited_email) BETWEEN 3 AND 254 AND
    invited_email = lower(btrim(invited_email)) AND
    invited_email ~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'
  ),
  CONSTRAINT staff_invitation_time_check CHECK (expires_at > created_at),
  CONSTRAINT staff_invitation_state_check CHECK (
    (consumed_at IS NULL AND accepted_by IS NULL) OR
    (consumed_at IS NOT NULL AND accepted_by IS NOT NULL AND revoked_at IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS staff_invitations_business_idx ON staff_invitations(business_id,created_at DESC);
CREATE INDEX IF NOT EXISTS staff_invitations_pending_idx ON staff_invitations(business_id,expires_at)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

-- Ensure inviter and accepted staff both belong to the same tenant even when DB
-- is written by privileged server code. Existing staff.id is the primary key.
CREATE UNIQUE INDEX IF NOT EXISTS staff_id_business_id_unique ON staff(id,business_id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='staff_inviter_tenant_fk') THEN
    ALTER TABLE staff_invitations ADD CONSTRAINT staff_inviter_tenant_fk
      FOREIGN KEY (invited_by,business_id) REFERENCES staff(id,business_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='staff_acceptor_tenant_fk') THEN
    ALTER TABLE staff_invitations ADD CONSTRAINT staff_acceptor_tenant_fk
      FOREIGN KEY (accepted_by,business_id) REFERENCES staff(id,business_id);
  END IF;
END $$;
COMMIT;
