-- Rollback of Opada migrations 0001–0005 accidentally applied to Herbert's Neon database on 2026-10-22.
-- See 2026-10-22-migrations-on-herbert-db.md.
--
-- !!! NOT RUN. Requires Okunola's approval and Herbert's review. !!!
-- Dry run first: change the final COMMIT to ROLLBACK and read the NOTICEs.
--
-- Safety rules:
--   * Aborts unless the database is 'opada' and schema_migrations holds exactly our 5 versions.
--   * An index is dropped only if its name is one our migrations create AND its OID is newer than
--     schema_migrations (the first object our run created). An older same-named index is Herbert's.
--   * No row in any of Herbert's tables is modified or deleted.

BEGIN;

DO $$
DECLARE
  marker oid;
  versions text;
  idx text;
  idx_oid oid;
  our_indexes text[] := ARRAY[
    'staff_business_id_idx', 'staff_api_tokens_token_hash_key', 'entries_business_created_idx',
    'flags_business_created_idx', 'payments_paystack_reference_key', 'payments_business_paid_idx',
    'flags_business_rule_day_item_key', 'menu_items_business_item_key'];
BEGIN
  IF current_database() <> 'opada' THEN
    RAISE EXCEPTION 'Wrong database: %', current_database();
  END IF;
  SELECT oid INTO marker FROM pg_class WHERE relname = 'schema_migrations' AND relnamespace = 'public'::regnamespace;
  IF marker IS NULL THEN
    RAISE EXCEPTION 'schema_migrations not found: nothing of ours to roll back';
  END IF;
  SELECT string_agg(version, ',' ORDER BY version) INTO versions FROM schema_migrations;
  IF versions IS DISTINCT FROM '0001_baseline,0002_entries_idempotency_key,0003_gemini_usage,0004_rules_flags,0005_messages' THEN
    RAISE EXCEPTION 'Unexpected schema_migrations contents: %', versions;
  END IF;

  -- Indexes from 0001/0004 that may or may not have been ours.
  FOREACH idx IN ARRAY our_indexes LOOP
    SELECT c.oid INTO idx_oid FROM pg_class c WHERE c.relname = idx AND c.relkind = 'i' AND c.relnamespace = 'public'::regnamespace;
    IF idx_oid IS NULL THEN
      RAISE NOTICE 'skip %: does not exist', idx;
    ELSIF idx_oid < marker THEN
      RAISE NOTICE 'keep %: older than our migration run (Herbert''s)', idx;
    ELSIF EXISTS (SELECT 1 FROM pg_constraint WHERE conindid = idx_oid) THEN
      RAISE NOTICE 'keep %: backs a constraint; review manually', idx;
    ELSE
      EXECUTE format('DROP INDEX public.%I', idx);
      RAISE NOTICE 'dropped index %', idx;
    END IF;
  END LOOP;
END $$;

-- 0005: entries columns (their indexes and the FK go with them), then the messages table.
ALTER TABLE entries DROP COLUMN IF EXISTS extraction;
ALTER TABLE entries DROP COLUMN IF EXISTS line_no;
ALTER TABLE entries DROP COLUMN IF EXISTS message_id;
DROP TABLE IF EXISTS messages;

-- 0004: flags columns.
ALTER TABLE flags DROP COLUMN IF EXISTS updated_at;
ALTER TABLE flags DROP COLUMN IF EXISTS details;

-- 0003
DROP TABLE IF EXISTS gemini_usage;

-- 0002 (entries_business_idempotency_key goes with the column)
ALTER TABLE entries DROP COLUMN IF EXISTS idempotency_key;

-- Left as-is by default (original definitions unknown; current versions accept everything the old ones did):
--   flags_status_check  now: status IN ('open','checked','resolved')
--   entries.quantity / entries.unit  now: nullable
-- Only if Herbert confirms the originals, uncomment and adjust:
-- ALTER TABLE flags DROP CONSTRAINT flags_status_check;
-- ALTER TABLE flags ADD CONSTRAINT flags_status_check CHECK (status IN ('open', 'checked'));
-- ALTER TABLE entries ALTER COLUMN quantity SET NOT NULL;
-- ALTER TABLE entries ALTER COLUMN unit SET NOT NULL;

DROP TABLE schema_migrations;

COMMIT;
