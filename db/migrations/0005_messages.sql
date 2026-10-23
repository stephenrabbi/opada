-- 0005_messages.sql
-- Every staff message is stored as received, before any AI runs, so nothing a staff member
-- sent is ever lost: if extraction fails, is capped or finds nothing, the message is still here.
CREATE TABLE IF NOT EXISTS messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      uuid NOT NULL REFERENCES businesses(id),
  staff_id         uuid NOT NULL REFERENCES staff(id),
  raw_text         text NOT NULL CHECK (char_length(raw_text) BETWEEN 1 AND 4000),
  source           text NOT NULL DEFAULT 'text' CHECK (source IN ('text', 'voice_transcript')),
  idempotency_key  uuid NOT NULL,
  -- received: stored, not processed yet | extracted: entries created | no_records: AI found none |
  -- failed: AI unavailable or invalid output | capped: daily AI limit reached
  status           text NOT NULL DEFAULT 'received'
                   CHECK (status IN ('received', 'extracted', 'no_records', 'failed', 'capped')),
  extraction       jsonb,           -- provider, model, notes and the model's raw output
  error            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  processed_at     timestamptz
);
-- A double tap or retry of the same message is processed once (and costs one AI call).
CREATE UNIQUE INDEX IF NOT EXISTS messages_business_idempotency_key ON messages (business_id, idempotency_key);
CREATE INDEX IF NOT EXISTS messages_business_created_idx ON messages (business_id, created_at DESC);

-- Entries extracted from a message point back to it; line_no makes a retried message idempotent.
ALTER TABLE entries ADD COLUMN IF NOT EXISTS message_id uuid REFERENCES messages(id);
ALTER TABLE entries ADD COLUMN IF NOT EXISTS line_no integer;
CREATE UNIQUE INDEX IF NOT EXISTS entries_message_line_key ON entries (message_id, line_no);
-- The model's original numbers and the reasons this entry needs review (null for manual entries).
ALTER TABLE entries ADD COLUMN IF NOT EXISTS extraction jsonb;

-- Incomplete extractions are saved with needs_review instead of blocking the flow, so an
-- AI entry may lack a quantity or a recognised unit. (0001 had INFERRED NOT NULL here; the
-- manual form still requires both through src/ingest-schema.js.)
ALTER TABLE entries ALTER COLUMN quantity DROP NOT NULL;
ALTER TABLE entries ALTER COLUMN unit DROP NOT NULL;
