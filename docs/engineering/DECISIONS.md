# Decisions (short ADRs)

Format: ID, date, status, decision, why. Open questions live in the audit (§6) until decided.

## ADR-000: Record decisions here (2026-10-21, accepted)
Non-obvious engineering choices are logged here with the reason, so the next engineer doesn't have to rediscover them.

## ADR-001: Fallback tag before any M0 change (2026-10-21, accepted)
`demo-day-v0-fallback` → `1eb5784` (PR #5 head). **Why:** a known build to return to if Option B isn't ready.

## ADR-002: Demo Day is Option B with two checkpoints (2026-10-21, accepted by Okunola)
Build the minimal real loop. **Thu 22 Oct 12:00 WAT:** loop must work end to end locally, else stop and prep Option A. **Thu 22 Oct 18:00 WAT:** loop green on staging, else fall back to Option A.

## ADR-003: Self-sufficient infrastructure (2026-10-21, accepted by Okunola)
Okunola's own free Neon, Vercel Hobby, Paystack test-mode and Gemini key; secrets only in `.env.local` and Vercel env. Don't connect to Herbert's services. No deploy until Okunola confirms accounts. **Constraint:** switching to other infrastructure must be env-var-only, so no provider IDs are hard-coded.

## ADR-004: Platform choice deferred until after Demo Day (2026-10-21, accepted by Okunola)
M1 stays platform-neutral (Supabase vs Neon + RLS + auth library; trade-offs in ROADMAP M1). No migration work before then. Supersedes audit recommendation D1.

## ADR-005: Schema reconstructed from code (2026-10-21, accepted)
The original schema was never committed and we have no access to it. `0001_baseline.sql` is rebuilt from the queries; guesses are marked `-- INFERRED`; `IF NOT EXISTS` throughout. **Before** pointing at an existing DB, diff against its `pg_dump --schema-only`.

## ADR-006: Own migration runner, `pg` for scripts, PGlite for tests (2026-10-21, accepted)
~50-line forward-only runner (checksums, one transaction per file) instead of a migration framework, to keep it small two days before the demo. Scripts use `pg`, so any Postgres works. Tests use in-memory PGlite (no network, no Docker). Checksums normalise CRLF→LF because Windows checkouts and CI differ. **Limitation:** the *app* uses the Neon HTTP driver, so the app itself needs a Neon database; plain local Postgres works for scripts and tests only.

## ADR-007: Server is the authority on totals, for every entry type (2026-10-21, accepted)
`amount_kobo` must equal `round(quantity × unit_price_kobo)` (nearest kobo, so fractional kg/litre quantities work), else 422 `TOTAL_MISMATCH` with the server's figure. Okunola asked for sales; I applied it to expenses, restocks and stock counts too, because a mismatched total is equally wrong there. **Tell me if any type should be exempt.**

## ADR-008: Idempotency key per submission, not per field set (2026-10-21, accepted)
Required client UUID; unique `(business_id, idempotency_key)`; repeat returns the original entry with `duplicate:true`. The form reuses the key while the same fields are retried and clears it after a confirmed save. **Why:** two genuinely identical sales (another 2 jollof, cash) must both save, so content-based dedupe would be wrong.

## ADR-009: Gemini cap counted in the database (2026-10-21, accepted)
Hard maximum 200 calls per Africa/Lagos day; `GEMINI_DAILY_CALL_CAP` may only lower it. Reserved atomically **before** each call (failed calls count, as they may still cost). **Why DB, not memory:** Vercel runs many short-lived instances; an in-memory counter would reset and undercount.

## ADR-010: Accept the remaining postcss advisory until Next 16 (2026-10-21, accepted)
After Next 15.5.28, `npm audit` still reports `postcss` 8.4.31 bundled inside Next (fix requires Next 16, a major). It only processes our own CSS at build time and never sees user input. Revisit in M3.

## Pending
- D2 Incremental TypeScript from M1.
- D4 Owner alert channel beyond in-app polling (WhatsApp / SMS / push), M2, costs money.
- D5 Paystack-only reconciliation scope (current design).
