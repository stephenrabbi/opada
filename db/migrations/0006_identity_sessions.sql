-- Add optional external identity mapping and revocable staff sessions.
-- Run only through the numbered migration runner on a reviewed, isolated DB.
-- No identity provider or public login is enabled by this schema change.
ALTER TABLE staff ADD COLUMN IF NOT EXISTS auth_subject text;
-- Identity subjects may be reused across independently managed businesses.
-- The existing (business_id, auth_subject) uniqueness constraint is the tenant boundary.
-- Never impose global auth_subject uniqueness across unrelated tenants.
-- Composite foreign keys prevent session records from crossing hospitality businesses.
CREATE UNIQUE INDEX IF NOT EXISTS staff_id_business_id_unique ON staff(id,business_id);
CREATE TABLE IF NOT EXISTS staff_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES businesses(id),
  token_digest char(64) NOT NULL UNIQUE
    CHECK (token_digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CONSTRAINT staff_session_time_check CHECK (expires_at > created_at),
  CONSTRAINT staff_session_tenant_fk FOREIGN KEY (staff_id,business_id)
    REFERENCES staff(id,business_id)
);
CREATE INDEX IF NOT EXISTS staff_sessions_staff_idx ON staff_sessions(staff_id,created_at DESC);
CREATE INDEX IF NOT EXISTS staff_sessions_active_idx ON staff_sessions(expires_at)
  WHERE revoked_at IS NULL;
