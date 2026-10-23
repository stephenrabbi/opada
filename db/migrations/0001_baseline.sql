-- 0001_baseline.sql
-- Reconstructed from the SQL in app/api/** and src/** at PR #5 head 1eb5784.
-- The original Neon schema was never committed. This is NOT a dump of it.
--
-- Marking:
--   (unmarked)    required by the code: a column a query reads/writes, an ON CONFLICT target,
--                 or a value list the code validates against
--   -- INFERRED   a type, default, nullability, index or constraint guessed from how the code
--                 uses the column
--
-- Every statement is IF NOT EXISTS so it is safe to re-run. Before running it against an
-- existing database, diff it against `pg_dump --schema-only` of that database first.
-- gen_random_uuid() is built into PostgreSQL 13+.

CREATE TABLE IF NOT EXISTS businesses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- INFERRED: uuid ids throughout (flag ids are validated as UUIDs)
  name        text NOT NULL,                               -- test-mode gating checks name LIKE 'OPADA SYNTHETIC%'
  timezone    text NOT NULL DEFAULT 'Africa/Lagos',        -- INFERRED: default
  created_at  timestamptz NOT NULL DEFAULT now()           -- INFERRED
);

CREATE TABLE IF NOT EXISTS staff (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),       -- INFERRED: uuid
  business_id   uuid NOT NULL REFERENCES businesses(id),
  role          text NOT NULL
                CHECK (role IN ('owner', 'manager', 'staff')),    -- values from authorizeStaff(); CHECK is INFERRED
  display_name  text NOT NULL,                                    -- INFERRED: NOT NULL
  active        boolean NOT NULL DEFAULT true,                    -- INFERRED: default
  created_at    timestamptz NOT NULL DEFAULT now()                -- INFERRED
);
CREATE INDEX IF NOT EXISTS staff_business_id_idx ON staff (business_id);  -- INFERRED

CREATE TABLE IF NOT EXISTS staff_api_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- INFERRED
  staff_id    uuid NOT NULL REFERENCES staff(id),
  token_hash  text NOT NULL,                               -- SHA-256 hex of the bearer token (src/token-auth.js)
  expires_at  timestamptz,                                 -- NULL means no expiry (per the auth query)
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()           -- INFERRED
);
CREATE UNIQUE INDEX IF NOT EXISTS staff_api_tokens_token_hash_key ON staff_api_tokens (token_hash);  -- INFERRED

CREATE TABLE IF NOT EXISTS entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- INFERRED: uuid (returned as entry_id)
  business_id      uuid NOT NULL REFERENCES businesses(id),
  type             text NOT NULL
                   CHECK (type IN ('sale', 'expense', 'restock', 'stock_count')),  -- values from src/ingest-schema.js
  item             text NOT NULL CHECK (char_length(item) BETWEEN 1 AND 160),
  quantity         numeric(14, 3) NOT NULL CHECK (quantity >= 0),  -- INFERRED: numeric, quantities can be fractional (kg, litre)
  unit             text NOT NULL
                   CHECK (unit IN ('plate', 'piece', 'kg', 'litre', 'bag')),
  unit_price_kobo  bigint CHECK (unit_price_kobo >= 0),  -- INFERRED: bigint; nullable so AI extractions missing a price can be saved for review
  amount_kobo      bigint CHECK (amount_kobo >= 0),      -- INFERRED: bigint; nullable for the same reason
  payment_method   text NOT NULL
                   CHECK (payment_method IN ('cash', 'transfer', 'mixed', 'unknown')),
  payment_split    jsonb,                                -- {cash_kobo, transfer_kobo} when payment_method = 'mixed'
  recorded_by      uuid NOT NULL REFERENCES staff(id),
  raw_text         text NOT NULL,                        -- the staff member's original message
  source           text NOT NULL DEFAULT 'text',         -- INFERRED: default (code writes 'text')
  needs_review     boolean NOT NULL DEFAULT true,        -- INFERRED: default
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS entries_business_created_idx ON entries (business_id, created_at DESC);  -- INFERRED: matches ORDER BY

CREATE TABLE IF NOT EXISTS flags (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- /api/flags/check requires an RFC 4122 UUID
  business_id       uuid NOT NULL REFERENCES businesses(id),
  rule              text NOT NULL
                    CHECK (rule IN ('stock_sales', 'transfer_paystack', 'margin_squeeze')),  -- names from src/process.js; CHECK is INFERRED
  day               date NOT NULL,                     -- INFERRED: Africa/Lagos calendar day the flag covers
  item              text,                              -- INFERRED: nullable (transfer flags are not per item)
  amount_gap_kobo   bigint,                            -- INFERRED: nullable (margin flags have no money gap)
  evidence_ids      uuid[] NOT NULL DEFAULT '{}',      -- INFERRED: uuid[] of entry/payment ids
  suggested_action  text,                              -- INFERRED: text
  status            text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'checked')),  -- 'open' -> 'checked' in /api/flags/check; CHECK is INFERRED
  checked_by        uuid REFERENCES staff(id),
  checked_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flags_business_created_idx ON flags (business_id, created_at DESC);  -- INFERRED

CREATE TABLE IF NOT EXISTS action_audit (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- INFERRED
  business_id  uuid NOT NULL REFERENCES businesses(id),
  flag_id      uuid NOT NULL REFERENCES flags(id),          -- INFERRED: NOT NULL + FK
  actor_id     uuid NOT NULL REFERENCES staff(id),          -- INFERRED: NOT NULL + FK
  action       text NOT NULL,                               -- code writes 'mark_checked'
  created_at   timestamptz NOT NULL DEFAULT now()           -- INFERRED
);

CREATE TABLE IF NOT EXISTS paystack_expected_references (
  reference             text PRIMARY KEY,             -- server-generated 'opada_test_<24 hex>'; PK is INFERRED
  business_id           uuid NOT NULL REFERENCES businesses(id),
  expected_amount_kobo  bigint NOT NULL CHECK (expected_amount_kobo > 0),  -- INFERRED: bigint, > 0
  currency              text NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),  -- INFERRED: CHECK (code only writes 'NGN')
  created_at            timestamptz NOT NULL DEFAULT now()  -- INFERRED
);

CREATE TABLE IF NOT EXISTS payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- INFERRED
  business_id         uuid NOT NULL REFERENCES businesses(id),
  paystack_reference  text NOT NULL,
  amount_kobo         bigint NOT NULL CHECK (amount_kobo > 0),     -- INFERRED: bigint, > 0 (Paystack validation rejects <= 0)
  channel             text NOT NULL DEFAULT 'unknown',
  paid_at             timestamptz NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()           -- INFERRED
);
-- Required: the webhook and /api/paystack/reconcile use ON CONFLICT (paystack_reference) DO NOTHING
-- to record each Paystack payment exactly once. Kept as a separate statement so it is also added
-- to a pre-existing payments table. It fails loudly if duplicate references already exist.
CREATE UNIQUE INDEX IF NOT EXISTS payments_paystack_reference_key ON payments (paystack_reference);
CREATE INDEX IF NOT EXISTS payments_business_paid_idx ON payments (business_id, paid_at DESC);  -- INFERRED
