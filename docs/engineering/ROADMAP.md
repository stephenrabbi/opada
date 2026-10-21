# Opada roadmap

Last updated 21 Oct 2026. Basis: [AUDIT_2026-10-21.md](AUDIT_2026-10-21.md). Each milestone ships as small PRs. Nothing merges with failing tests, build or (once added) lint/typecheck.

Product rules that hold in every milestone: AI extracts and explains, code calculates; AI text with numbers is checked against computed values (template fallback); flags show evidence, not accusations; incomplete extractions save with `needs_review`; Paystack is the source of truth for money received; kobo integers; Africa/Lagos days.

---

## M0: Demo safety (deadline Fri 23 Oct 2026)

**Rule:** only demo-path changes. Everything goes to preview/staging. Okunola promotes.

**Blocked on access (A1):** without Vercel + Neon access, I can only prepare code and tests. I can't deploy, inspect the DB, or rehearse on staging.

### M0 plan

| # | Task | Est. | When |
|---|---|---|---|
| 0.1 | **Freeze a fallback.** Tag the current PR #5 head `1eb5784` as `demo-day-v0-fallback`. Record its preview URL as the rollback target | 0.25 h | Wed night |
| 0.2 | Security patch: `next` 15.5.9 → 15.5.28, commit lockfile, CI → `npm ci`. Verify build + tests + preview | 1 h | Wed night |
| 0.3 | Schema baseline: `pg_dump --schema-only` from Neon (staging branch) → `db/schema/0000_baseline.sql`. Confirm `UNIQUE(payments.paystack_reference)` | 1 h | On Neon access |
| 0.4 | **Decision D3: Option A or B** (below) | — | Okunola, Thu 09:00 |
| 0.5 | Option B build (if chosen) | 12 h | Thu |
| 0.6 | Three timed dry runs on staging with the simulated restaurant, clearly labelled SIMULATED; fallback screenshots + screen recording | 2 h | Thu evening |
| 0.7 | Tag the known-good commit `demo-day-v1`; write the rollback steps into `docs/demo-day-runbook.md` | 0.5 h | Thu evening |
| | **Total (Option B)** | **≈17 h** | |

### Option A: demo what exists (≈4 h total)
Use the current runbook: token sign-in → manual staff form → owner dashboard shows "needs review" entry, verified ₦100 Paystack test receipt, and hand-seeded margin flag. This is honest, but it **isn't the 60-second loop**.

### Option B: minimal real loop (recommended, with a hard cut-off)
Wire the missing middle, scoped to the simulated restaurant only:

| Step | Work | Est. |
|---|---|---|
| B1 | `POST /api/ingest/message`: text (or browser transcript) → `extractWithGemini` → insert entries (`needs_review = true` when any field is null) with the original message, author and timestamp. 12 s timeout; on AI failure save raw text as `needs_review` | 3 h |
| B2 | `runChecks(businessId, lagosDay)`: load the day's entries + payments + synthetic menu costs, call existing `processFacts`, insert flags with `evidence_ids`, deduped by `(business_id, rule, day, item)`. Called synchronously after B1 and after the webhook records a payment | 4 h |
| B3 | Owner dashboard: 5 s polling while open, "new flag" highlight, **Mark as checked** button → existing `/api/flags/check`, evidence drill-down (time, author, original message) | 2.5 h |
| B4 | Tests: Lagos-day boundary (23:59/00:00 WAT), dedupe, missing prices → skipped, ingest happy/invalid/unauth integration tests with a mocked DB + mocked Gemini | 2.5 h |

**Cut-off:** if B isn't green on staging (3 consecutive timed runs < 60 s) by **Thu 22 Oct 18:00 WAT**, revert staging to `demo-day-v0-fallback` and present Option A. The stock rule needs opening/closing counts and recipes that don't exist yet, so B demos the **transfer-vs-Paystack** and **margin** rules only.

**Credits:** each demo message is 1 Gemini call. Dry runs ≈ 30 calls. Negligible.

### M0 acceptance criteria
- [ ] `demo-day-v1` tag exists; CI green on it; its preview build READY.
- [ ] On staging, a typed message produces a stored entry and, where the rules trigger, a flag on the owner dashboard **within 60 s**, 3 runs in a row, timings recorded.
- [ ] Flag shows its evidence (entry time, author, original text) and can be marked checked; an audit row exists.
- [ ] Every screen in the demo says SIMULATED / TEST MODE.
- [ ] Rollback rehearsed once: promote-back target written down and tested on preview.
- [ ] Nothing touches production; no live Paystack keys.

---

## M1: Real-customer foundation

Pending decision **D1** (Supabase vs Neon). The criteria below hold either way.

- **Auth** with owner/manager/staff roles; owner invites staff (link/OTP); sessions, logout, revocation. Bearer test tokens removed.
- **Multi-tenancy:** RLS enabled on **every** table, keyed off the authenticated user's business membership. The app connects with a non-owner role. Service-role key is server-only.
- **Onboarding:** create business → menu items with price → recipes per plate (ingredient, qty, unit, cost) → staff invites → Paystack connection (test mode: subaccount/reference mapping).
- **Config to DB:** thresholds (10 %, ₦5,000, ₦2,000, 35 %, ₦50 rounding) per business in a `business_settings` table with these defaults.
- Schema managed by versioned migrations in repo; seed script creates **only** the clearly-labelled simulated restaurant.

**Acceptance:** two test businesses; automated tests prove a user in A gets 0 rows / 403 for every B resource on every route **and** directly against the DB with RLS (no app-code filtering). Onboarding to first recorded sale in under 10 min for a new owner.

## M2: Core product hardening

- Ingestion: idempotency key, retries with backoff, voice processed in background (upload → job → result), timeouts, `needs_review` on any failure.
- Extraction eval suite: the 20 baseline messages + ≥30 more Pidgin/Yoruba/code-switched cases. Pass = item, quantity, unit, amount all correct. Report per-language accuracy. (Ask before any large eval run.)
- Rule engine: fixed fixtures; edge cases (zero stock, negative gaps, missing prices, Lagos midnight, DST-free offset assumptions documented).
- Paystack webhook: event log table, replay protection, unknown references stored as unmatched (200), reconciliation job.
- Realtime updates with polling fallback.
- 9pm WAT daily summary: profit, unmatched money. AI wording passes the number check, else template.
- Playwright E2E of the full loop in CI.

**Acceptance:** eval ≥ 90 % pass overall and per language reported; duplicate webhook deliveries ×5 → 1 payment; E2E green in CI; summary numbers equal a hand-computed fixture.

## M3: Production readiness

Structured logs; error tracking (free tier, e.g. Sentry Developer); rate limiting per user/IP; zod validation at every boundary; automated backups + one restore drill; NDPA basics: privacy policy and terms with the real controller identity, retention periods, deletion/export flow, explicit consent for voice data, data minimisation review.

**Acceptance:** restore drill documented; deletion request completes end to end; no route accepts unvalidated input (checked by test); alerts fire on 5xx spikes.

## M4: Business model

Subscription billing via Paystack **test mode only** (plans, trial, renewal webhooks, dunning, cancellation). Live plans only after Okunola approves.

**Acceptance:** test-mode subscribe → renew → fail → recover → cancel cycle passes with webhooks idempotent.
