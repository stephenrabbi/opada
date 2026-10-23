-- 0004_rules_flags.sql
-- What src/checks.js needs to turn a Lagos day of entries and Paystack payments into flags.

-- Menu price and ingredient cost per plate, for the margin rule. Demo-scoped: M1 onboarding
-- replaces this with recipes (ingredient, quantity, unit, cost) per plate.
CREATE TABLE IF NOT EXISTS menu_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           uuid NOT NULL REFERENCES businesses(id),
  item                  text NOT NULL CHECK (char_length(item) BETWEEN 1 AND 160),
  price_kobo            bigint NOT NULL CHECK (price_kobo > 0),
  ingredient_costs_kobo bigint[] NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS menu_items_business_item_key ON menu_items (business_id, lower(item));

-- Computed figures behind a flag (recorded vs verified totals, margin inputs), so the owner
-- screen and any later AI explanation use the numbers code already calculated.
ALTER TABLE flags ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}';
ALTER TABLE flags ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- One flag per business, rule, Lagos day and item; re-running checks updates it in place.
CREATE UNIQUE INDEX IF NOT EXISTS flags_business_rule_day_item_key ON flags (business_id, rule, day, (coalesce(item, '')));

-- 'resolved': the condition no longer holds (e.g. a late Paystack payment arrived), set by code.
-- flags_status_check is the default name Postgres gives the inline CHECK in 0001.
ALTER TABLE flags DROP CONSTRAINT IF EXISTS flags_status_check;
ALTER TABLE flags ADD CONSTRAINT flags_status_check CHECK (status IN ('open', 'checked', 'resolved'));
