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

## ADR-022: Gemini capacity via paid tier, no Vertex work (2026-10-22, accepted by Okunola)
D6 resolved: Okunola links the GCP credit/billing to the Opada project, which moves the existing AI Studio key to paid-tier capacity with no code change. Keep `gemini-3.5-flash` + `gemini-3.5-flash-lite` fallback. Re-run 3 timed loops (English, Pidgin, Yoruba) once billing is confirmed on.

## ADR-023: Fallback retry waits 1.5 s; explicit time budget (2026-10-22, accepted)
On 429/5xx/timeout: wait 1.5 s, reserve one more call against the cap, retry on the fallback model. Primary and fallback timeouts are 10 s each (were 12 s back to back): worst case 21.5 s of AI time. `/api/ingest/message` `maxDuration` raised 30 → 40 s (Hobby allows 60).

## ADR-024: Staging on Okunola's Vercel Hobby, cut-off 21:00 (2026-10-22, accepted by Okunola)
Preview-only deploys via CLI to `okun15olas-projects/opada-staging`, alias `opada-staging-okun15ola.vercel.app`, functions in **fra1** next to the Neon DB. Env vars set through `vercel env add` from stdin, never printed. `.vercelignore` keeps env files and seed tokens out of uploads. **No Paystack webhook for the demo**: the seeded test-mode payments are the documented fallback. If staging fails by 21:00, the fallback is **Option B locally** (LOCAL_DEMO_RUNBOOK.md), not Option A.

## ADR-025: Demo shows the suggested price only (2026-10-22, accepted by Okunola)
Margin alerts display "Suggested price: ₦X" from code; there is no "Apply new price" action (a browser test asserts no apply button exists).

## ADR-026: Owner alerts refresh by polling every 5 s (2026-10-22, accepted)
Polling while the tab is visible (paused when hidden), plus a "New" highlight and screen-reader announcement for new or changed alerts. Realtime push is M2. Polling is simple, works on Hobby, and fits the 60 s loop.

## ADR-027: Herbert's database: rollback written, not run (2026-10-22, accepted by Okunola)
Confirmed it is Herbert's Neon project. Change list and a tested rollback script are in `docs/engineering/incidents/`; not run. Nothing on his pushed branches breaks from our changes.

## ADR-028: Herbert's work is reviewed, not merged, until after Demo Day (2026-10-22, accepted)
His auth work is on PR #5's branch (not main). Review and merge plan: MAIN_REVIEW.md. The demo stays on our stack.

## ADR-029: Demo Day is Saturday 24 Oct; Friday is a controlled integration day (2026-10-22, accepted by Okunola)
- **Fallback, fixed tonight:** tag `demo-day-v1` → `671d973` (stack #7–#13 head; the commit staging and the backup video were built from). Staging and the video stay as they are.
- **Friday:** `integration/demo-day` from PR #5's branch (incl. Herbert's ~30 auth commits) + our stack merged in; resolve the 3 conflicts; one migration naming scheme (new ADR); Herbert's auth stays disabled. His live-site code is included only if pushed by 10:00 WAT and clean. Full tests → **separate** staging preview (the working one is untouched) → 3 timed loops.
- **18:00 WAT gate:** pass → the demo uses integration; fail → the demo uses `demo-day-v1`.
- No merges into PR #5's branch or `main`, and no production deploys, until after the demo and Herbert confirms the production branch.
- Neon claimable DB expires 25 Oct 15:55 WAT (day after the demo): claim it on Friday.

## ADR-030: Friday integration is based on Herbert's branch; migration naming is `NNNN_` (2026-10-23, accepted by Okunola)
`integration/demo-day` is created from Herbert's `integration/hospitality-auth-operations-20261022` @ `7ae86a5` (which already contains `demo-day-v1` and #7–#13, resolves the 3 conflicts as MAIN_REVIEW.md proposed, and keeps his auth disabled). His branch is left untouched. **Migration naming: the `NNNN_name.sql` scheme with our checksummed runner.** Herbert already renamed his migrations to `0006_identity_sessions`, `0007_login_attempt_buckets`, `0008_staff_invitations`; the date-named files are retired. Verified: all 8 apply cleanly through `npm run db:migrate` on an empty database. PRs #14 and #15 are not merged or approved; a comment review was posted on #15.

## ADR-031: Integration preview infrastructure is fully separate (2026-10-23, accepted)
Vercel project `okun15olas-projects/opada-integration` (alias `opada-integration-okun15ola.vercel.app`, protected) with its own Preview env vars, and its own temporary claimable Neon project `little-frog-05629244` (expires 2026-10-26 07:34 UTC). The working staging project, database and alias are untouched. Integration seed tokens are kept in `.seed-tokens.integration.local.json` (gitignored).
**Incident:** the first CLI deploy to the new project became its **production** deployment (a new project's first deploy defaults to production), publicly reachable at `opada-integration.vercel.app`. It has **no env vars and no database** (all vars are Preview-only): only public pages and the browser-only `/demo` are visible, and APIs return 401/404/503. Redeployed explicitly with `--target=preview`. **Removing the public alias or deployment awaits Okunola's OK** (deleting Vercel domains or deployments is a guarded action). Lesson: always pass `--target=preview` to `vercel deploy`.

## ADR-032: `/demo` is a verified backup; gate timings need a real-browser method (2026-10-23, accepted)
Herbert's `/demo` (browser-only simulation) passes his QA script and 3 timed loops at 2.0–3.4 s with zero network calls to APIs. It is a **simulation**, not the real loop. `vercel curl` adds several seconds per call (login + CLI), so it is valid for checking the integration preview works but **not for timing**. For the 18:00 gate, time the real loop either on the protected preview through a Vercel **Protection Bypass for Automation** secret (Okunola enables it; kept out of logs), or locally against the integration database (conservative: Lagos → Frankfurt is slower than Vercel fra1 → Frankfurt).

## Pending
- **Public `opada-integration.vercel.app`:** remove the alias or the stray production deployment? (ADR-031)
- **Production branch:** which branch Herbert's Vercel deploys to production (evidence says not PR #5's; Herbert to confirm). Merge hold (ADR-012) stays until then.
- **Flag lifecycle (ADR-015):** confirm auto-resolve and re-open behaviour.
- D2 Incremental TypeScript from M1.
- D4 Owner alert channel beyond in-app polling (WhatsApp / SMS / push), M2, costs money.
- D5 Paystack-only reconciliation scope (current design).
