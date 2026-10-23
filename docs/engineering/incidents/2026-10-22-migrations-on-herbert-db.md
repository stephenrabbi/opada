# Incident: our migrations ran on Herbert's Neon database (22 Oct 2026)

**Status:** contained. **Rollback: superseded, pending Herbert's confirmation** (23 Oct). The script is kept for the record and must **not** be run.

**Update 23 Oct 2026:** Herbert's read-only audit (`NEON_SCHEMA_READONLY_AUDIT_20261023.md` on `integration/hospitality-auth-operations-20261022`) confirms our `0001`–`0005` are on his Neon **`main`** branch, and he is **building on them**: he created a fresh staging branch from `main` (`opada-release-staging-20261023`) and applied his `0006`–`0008` there only, leaving `main` otherwise unchanged. Rolling back would now undo the schema his release plan depends on. Okunola decided not to run it (23 Oct); it stays superseded unless Herbert asks otherwise.
**Severity:** low. Additive and relaxing schema changes only; no data read, changed or deleted; nothing on Herbert's branches breaks (checked 22 Oct evening, see below).

## What happened
- 22 Oct ~14:04 UTC (15:04 WAT): `.env.local` was filled with a Neon connection string. `npm run db:migrate` applied our migrations `0001`–`0005` to it (database `opada`, host in `eu-west-2`).
- `npm run db:seed` then failed (`menu_items.ingredient_costs_kobo` missing). The whole seed ran in one transaction and **rolled back**: no simulated restaurant, tokens or rows were written.
- Reading the schema (table and column names and row counts only; no row contents read) showed pre-existing tables, columns and data that our migrations hadn't created. I stopped and reported. Okunola confirmed it is **Herbert's Neon project**.
- Staging moved to a separate, empty, claimable Neon database (ADR-020).

**Root cause:** `db:migrate` didn't check whether the target was empty or already ours. All `0001` statements are `IF NOT EXISTS`, which silently adopts an existing schema.
**Fix (follow-up, not yet built):** `db:migrate` refuses to run when the database has user tables but no `schema_migrations`, unless `--adopt` is passed explicitly.

## Exactly what changed on Herbert's database
Rows: **none** added, changed or deleted in his tables (`schema_migrations` got 5 rows; that table is ours).

| Object | Change | Confidence it was ours |
|---|---|---|
| `schema_migrations` | **table created** (5 rows) | certain |
| `gemini_usage` | **table created** (0 rows) | certain (no Herbert code references it) |
| `messages` | **table created** (0 rows) + indexes `messages_business_idempotency_key`, `messages_business_created_idx` | certain |
| `entries.idempotency_key`, `entries.message_id`, `entries.line_no`, `entries.extraction` | **columns added** (all NULL) + indexes `entries_business_idempotency_key`, `entries_message_line_key`, FK `entries.message_id → messages` | certain (appended after `created_at`; not used by Herbert's code) |
| `entries.quantity`, `entries.unit` | **`NOT NULL` dropped** | change certain; **original state unknown** (our 0001 *inferred* NOT NULL) |
| `flags.details` (jsonb, default `{}`), `flags.updated_at` | **columns added** | certain |
| `flags_status_check` | **dropped and re-created** as `status IN ('open','checked','resolved')` | change certain; **original definition unknown** |
| indexes `staff_business_id_idx`, `staff_api_tokens_token_hash_key` (unique), `entries_business_created_idx`, `flags_business_created_idx`, `payments_business_paid_idx`, `flags_business_rule_day_item_key` (unique), `menu_items_business_item_key` (unique, `lower(item)`) | **created if no index of that name existed** | the rollback script decides per index (see below) |
| `payments_paystack_reference_key` | almost certainly **pre-existing** (his code relies on `ON CONFLICT (paystack_reference)`); our `IF NOT EXISTS` was a no-op | rollback leaves it alone unless proven ours |
| Pre-existing objects we did **not** touch | `webhook_events`, `staff.auth_subject`, `staff_api_tokens.label`, `menu_items` (incl. `recipe`), `entries.confidence`, `action_audit.details`, his data | — |

## Does anything of Herbert's break? (checked 22 Oct evening, read-only)
Checked `origin/feature/paystack-free-checkout` @ `059536d` and `origin/feat/verified-identity-session-bridge` @ `82a5cac`:
- He only ever writes `flags.status = 'checked'`: allowed by the new constraint.
- His `INSERT`s into `entries`, `payments` and `action_audit` list their columns, so our new nullable columns don't affect them.
- His new migrations (`staff_sessions`, `staff_invitations`, unique `staff.auth_subject`) touch tables we didn't change.
- New unique indexes could only reject **duplicates**: two identical token hashes (impossible in practice), two menu items with the same name (case-insensitive) in one business, or two flags for the same business/rule/day/item. **Herbert should check** that his code never creates the last two.

## Rollback
Script: [`2026-10-22-rollback-herbert-db.sql`](2026-10-22-rollback-herbert-db.sql). **Do not run without Okunola's approval and Herbert's review.**
- One transaction. Aborts unless the database is named `opada` and has exactly our 5 `schema_migrations` rows.
- Drops only objects listed above **and** created after our `schema_migrations` table (by OID order), so it can't remove an older same-named object of Herbert's.
- Drops our columns, tables and `schema_migrations`.
- Leaves `flags_status_check` and the `entries` nullability as they are by default (original definitions unknown; the widened versions are harmless). Optional restore statements are included, commented out, for Herbert to enable if he confirms the originals.
- Prints a NOTICE for every object it drops or skips. Run it first with the final `COMMIT` changed to `ROLLBACK` as a dry run.

**Tested (22 Oct, throwaway local Postgres 17 named `opada`, never Herbert's):** built a stand-in of his schema (his extra columns, `webhook_events`, a pre-existing `payments_paystack_reference_key` UNIQUE constraint, `flags_status_check` as open/checked, NOT NULL quantity/unit, one data row) → ran our migrations (+25 columns, +14 indexes) → ran this script. Result: all 7 of our indexes dropped, **his `payments_paystack_reference_key` kept**, indexes identical to the original, data untouched; the only remaining differences are the two left by design (status constraint widened, quantity/unit nullable). A second run aborts with "schema_migrations not found".
