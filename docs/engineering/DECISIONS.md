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

## ADR-007: Server is the authority on totals, for every entry type (2026-10-21, accepted; refined by ADR-011)
`amount_kobo` must equal `round(quantity × unit_price_kobo)` (nearest kobo, so fractional kg/litre quantities work). Applies to all entry types (confirmed by Okunola 2026-10-22).

## ADR-008: Idempotency key per submission, not per field set (2026-10-21, accepted)
Required client UUID; unique `(business_id, idempotency_key)`; repeat returns the original entry with `duplicate:true`. The form reuses the key while the same fields are retried and clears it after a confirmed save. **Why:** two genuinely identical sales (another 2 jollof, cash) must both save, so content-based dedupe would be wrong.

## ADR-009: Gemini cap counted in the database (2026-10-21, accepted)
Hard maximum 200 calls per Africa/Lagos day; `GEMINI_DAILY_CALL_CAP` may only lower it. Reserved atomically **before** each call (failed calls count, as they may still cost). **Why DB, not memory:** Vercel runs many short-lived instances; an in-memory counter would reset and undercount.

## ADR-010: Accept the remaining postcss advisory until Next 16 (2026-10-21, accepted)
After Next 15.5.28, `npm audit` still reports `postcss` 8.4.31 bundled inside Next (fix requires Next 16, a major). It only processes our own CSS at build time and never sees user input. Revisit in M3.

## ADR-011: Totals check depends on the source (2026-10-22, accepted by Okunola)
- **Manual form:** a mismatch is rejected: 422 `TOTAL_MISMATCH` with the server's figure.
- **Gemini-extracted:** never rejected. Saved with the server-computed amount, `needs_review = true`, and the model's original numbers kept in `entries.extraction` (`model_entry`, `model_amount_kobo`, `review_reasons`) plus the full model output in `messages.extraction`.
- **No unit price** (typical for stock counts): the check is skipped and the stated amount (or null) stands.
**Why:** a person correcting a form can fix a typo immediately; a staff member's voice/text message must never bounce, and nothing they sent may be lost.

## ADR-012: Don't merge the M0 stack until the production branch is confirmed (2026-10-22, accepted by Okunola)
Herbert's Vercel may treat `feature/paystack-free-checkout` as production; merging into it could redeploy the live site, and #9+ needs migrations his database doesn't have. #7–#12 stay **stacked drafts** until Okunola confirms. His auto-built previews are ignored.

## ADR-013: B1 hold released (2026-10-22, accepted by Okunola)
Gemini wiring proceeds. If Herbert's unpushed code turns up, compare and take the better parts.

## ADR-014: Store the message before any AI runs (2026-10-22, accepted)
New `messages` table holds every free-text/voice-transcript message with an idempotency key, *then* the AI budget is reserved and extraction runs. Outcomes are explicit statuses (`extracted`, `no_records`, `failed`, `capped`). Entries reference `message_id` + `line_no` (unique), so retries never duplicate. **Why:** "never block the flow" and "nothing a staff member sent is lost" hold even when Gemini is down or capped. All provider calls go through `src/ai.js` (`extractRecords`), the single seam for swapping providers.

## ADR-015: Flag lifecycle (2026-10-22, accepted, **owner-visible: please confirm**)
One flag per (business, rule, Lagos day, item); re-running checks updates it in place. Two behaviours change what the owner sees:
1. An **open** flag whose condition clears (e.g. a late Paystack payment closes the gap) becomes `resolved` automatically.
2. A flag the owner **checked** stays checked when re-run, *unless* new evidence changes the amount, which re-opens it.
Alternatives: never auto-resolve (owner clears everything), or never re-open (a new flag instead). I chose these so the owner neither chases gaps that closed nor misses a gap that grew after they looked.

## ADR-016: Incomplete transfer entries and the evidence rule (2026-10-22, accepted)
Transfer sales with no amount (or mixed with no split) aren't summed. If Paystack received **more** than recorded, they might explain the difference, so the rule is skipped (`unpriced_transfer_entries`). If Paystack received **less**, they can only widen the gap, so the flag stands as a lower bound and says how many entries are excluded. **Why:** evidence, not accusation. Never flag a gap that missing data could explain.

## ADR-017: `menu_items` is demo-scoped (2026-10-22, accepted)
Price + ingredient costs per plate, enough for the margin rule. M1 onboarding replaces it with recipes (ingredient, quantity, unit, cost). Rule thresholds are now a parameter of every check (defaults unchanged), ready for per-business settings in M1.

## ADR-018: One PGlite per test file (2026-10-22, accepted)
A fresh in-memory Postgres per test intermittently crashed parallel test runs with a WebAssembly out-of-memory error. One instance per file, with the schema dropped between tests, and `npm test` runs at most 2 files in parallel (`--test-concurrency=2`). Six DB test files on an 8 GB machine still crashed at the default of 7 parallel processes. Result: 4/4 clean full runs of 114 tests.

## ADR-019: Message endpoint gets 30 s (2026-10-22, accepted)
`/api/ingest/message` sets `maxDuration = 30` (Hobby allows up to 60 s; default is lower). Gemini has a 12 s timeout, plus DB writes and checks. Gemini "thinking" is left at its default; if latency threatens the 60 s loop, set a thinking budget of 0 and re-check accuracy.

## ADR-020: Staging database is a temporary claimable Neon project (2026-10-22, accepted by Okunola)
The URL first put in `.env.local` pointed at a **pre-existing database** with Herbert-style schema and data; migrations 0001–0005 ran on it (additive and relaxing changes only, nothing deleted) before this was spotted, and the seed rolled back. Staging moved to `npx neon@latest claim create` (Frankfurt), confirmed empty before migrating. **Expires 2026-10-25 14:55 UTC unless claimed** (see STAGING_SETUP.md). Lesson: the migrate script must confirm an empty or known database first. Follow-up: refuse to migrate when unknown tables exist unless `--adopt` is passed.

## ADR-021: Gemini model default and one fallback retry (2026-10-22, accepted)
`gemini-2.5-flash` returns 404 for new API keys. Default is now `gemini-3.5-flash`; on 429/5xx/timeout, one retry on `gemini-3.5-flash-lite`, with the extra call reserved against the 200/day cap first. Both overridable by env. **Observed 22 Oct ~16:00–17:00 WAT on the free AI Studio tier:** the primary returned 503 "high demand" on 4 of 7 calls and the fallback timed out twice. Free-tier capacity, not code, is now the main risk to the 60 s loop (see open decision D6).

## Pending
- **D6 Gemini capacity for Demo Day:** (a) Vertex AI on the Google Cloud hackathon credits (paid-tier capacity, same models, ~1.5 h behind `src/ai.js`; needs a GCP project + service account); (b) keep free tier and demo with pre-recorded fallback; (c) enable paid AI Studio billing (needs approval). Recommendation: (a).
- D2 Incremental TypeScript from M1.
- D4 Owner alert channel beyond in-app polling (WhatsApp / SMS / push), M2, costs money.
- D5 Paystack-only reconciliation scope (current design).
