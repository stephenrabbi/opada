-- 0002_entries_idempotency_key.sql
-- A double tap or network retry of the same staff submission must save exactly once.
-- The client sends a UUID per submission; /api/ingest inserts with
-- ON CONFLICT (business_id, idempotency_key) DO NOTHING and returns the original entry.
-- Nullable so rows created before this migration stay valid (NULLs never conflict).
ALTER TABLE entries ADD COLUMN IF NOT EXISTS idempotency_key uuid;
CREATE UNIQUE INDEX IF NOT EXISTS entries_business_idempotency_key ON entries (business_id, idempotency_key);
