# Opada roadmap

Last updated 22 Oct 2026. Basis: [AUDIT_2026-10-21.md](AUDIT_2026-10-21.md); decisions in [DECISIONS.md](DECISIONS.md). Each milestone ships as small PRs. Nothing merges with failing tests or build (or lint/typecheck, once added).

Product rules that hold in every milestone: AI extracts and explains, code calculates; AI text with numbers is checked against computed values (template fallback); flags show evidence, not accusations; incomplete extractions save with `needs_review`; Paystack is the source of truth for money received; kobo integers; Africa/Lagos days.

---

## M0: Demo safety (Demo Day **Sat 24 Oct 2026**; Friday = controlled integration, ADR-029)

**Rules:** only demo-path changes. Preview/staging only; Okunola promotes. **Option B approved** (ADR-002). **No merges** of the stacked M0 PRs until Okunola confirms Herbert's production branch (ADR-012).

**Infrastructure:** self-sufficient on Okunola's own free Neon, Vercel Hobby, Paystack test-mode and Gemini key (ADR-003). Nothing connects to Herbert's services. Everything is switchable to other infrastructure by env vars only. **No deploy until Okunola confirms the accounts are ready.**

### Checkpoints
| When (WAT) | Gate | If missed |
|---|---|---|
| **Thu 22 Oct 12:00** | Full loop works end to end **locally** (typed message → stored entry → rules → flag with evidence → mark checked) | Stop Option B, prep Option A |
| **Thu 22 Oct 18:00** | Same loop green on **staging**, 3 timed runs < 60 s | Re-point staging alias to `demo-day-v0-fallback`, present Option A |

### Tasks
| # | Task | Est. | Status |
|---|---|---|---|
| 0.1 | Tag fallback `demo-day-v0-fallback` → `1eb5784` | 0.25 h | ✅ done, pushed |
| 0.2 | Next 15.5.9 → 15.5.28, commit lockfile, CI `npm ci`; full tests + smoke of owner dashboard and webhook | 1 h | ✅ PR #7 |
| 0.3 | Schema reconstructed from code into `db/migrations/` (`-- INFERRED` marks), `npm run db:migrate` | 1.5 h | ✅ PR #8 |
| 0.3a | Seed: simulated restaurant + matching Paystack test-mode payments | 1 h | ✅ PR #8 |
| 0.3b | `STAGING_SETUP.md`: migrate, seed, Vercel CLI deploy, env vars, Paystack test webhook | 0.5 h | ✅ PR #8 |
| 0.4m | **Money:** server recomputes every total; manual mismatch rejected, Gemini mismatch saved with server amount + review; no price → check skipped (ADR-011) | 1 h | ✅ PR #9 (manual), PR #12 (Gemini) |
| 0.4i | **Money:** entry idempotency key, so a double tap saves once | 1 h | ✅ PR #9 |
| 0.4u | **Money:** unique constraint on `payments.paystack_reference` in the migration | — | ✅ PR #8 (0001) |
| 0.4g | Gemini hard cap 200 calls/Lagos-day, clear 429, call-count logging | 1 h | ✅ PR #10 |
| B1 | Message → Gemini → saved entries (`needs_review` on gaps/failures); staff quick-message box | 3 h | ✅ PR #12 (hold released, ADR-013) |
| B2 | `runChecks(business, lagosDay)` → flags with `evidence_ids`, deduped, auto-resolve | 4 h | ✅ PR #11 |
| B3 | Owner dashboard: 5 s polling, Mark as checked, evidence drill-down | 2.5 h | next |
| B4 | Tests: Lagos midnight boundary, dedupe, missing prices ✅ (in #11/#12); route integration against Neon | 1 h | after Neon |
| 0.5 | Okunola: accounts ready → I run migrate + seed + preview deploy per `STAGING_SETUP.md` | 1 h | waiting on Okunola |
| 0.6 | Three timed dry runs on staging; fallback screenshots + recording | 2 h | Thu |
| 0.7 | Tag `demo-day-v1`; rollback steps in `docs/demo-day-runbook.md` | 0.5 h | Thu |

Only the **transfer-vs-Paystack** and **margin** rules can be shown in B. The stock rule needs stock counts and recipes that don't exist yet.

**Credits:** about 1 Gemini call per demo message; dry runs ≈ 30 calls/day, well under the 200 cap.

### Option A (fallback)
Current runbook: token sign-in → manual staff form → owner dashboard shows a "needs review" entry and verified Paystack test receipts. Honest, but **not** the 60-second loop.

### M0 acceptance criteria
- [ ] `demo-day-v1` tag exists; CI green on it; its preview build READY.
- [ ] On staging, a typed message produces a stored entry and, where the rules trigger, a flag on the owner dashboard **within 60 s**, 3 runs in a row, timings recorded.
- [ ] Flag shows its evidence (entry time, author, original text) and can be marked checked; an audit row exists.
- [ ] Every screen in the demo says SIMULATED / TEST MODE.
- [x] Server rejects totals ≠ quantity × unit price; a double tap saves once; `paystack_reference` is unique (tests in PRs #8–#9).
- [x] Gemini usage is capped at 200/day with a clear error (PR #10).
- [x] Typed message → stored entries → rules → flags with evidence, in tests on the real migrations (PRs #11–#12). Still to prove on Neon + staging.
- [ ] Rollback rehearsed once: alias re-pointed to the previous deployment on preview.
- [ ] Nothing touches production or Herbert's services; no live Paystack keys.

---

## M1: Real-customer foundation (platform-neutral)

**The platform decision is deferred until after Demo Day (ADR-004).** No migration work before then. Both options meet the criteria below:

| | **A. Supabase** (Postgres + Auth + RLS + Realtime + Storage) | **B. Neon + Postgres RLS + an auth library** (e.g. Auth.js / Better Auth / Lucia-style) |
|---|---|---|
| Auth (owner/staff, invites, OTP/magic link) | Built in; phone OTP needs an SMS provider (paid) | We assemble it; more code, full control |
| RLS | First-class: `auth.uid()` in policies; dashboard tooling | Native Postgres RLS works; we set the user/business claim per request (`SET LOCAL` / JWT via Neon RLS) |
| Realtime (owner alerts) | Built in (Postgres changes over websockets) | Not included: polling, or add a service (Pusher/Ably free tiers) |
| Voice note storage | Supabase Storage with RLS-style policies | Separate store (Vercel Blob / R2 / S3) |
| Serverless fit on Vercel | Good (HTTP APIs + pooled connections) | Excellent: current driver; DB branching per preview |
| Migration cost from today | Port 3 migrations + seed; replace token auth; swap driver for supabase-js or `pg` | Smallest: keep driver and migrations; add auth + RLS policies |
| Free-tier limits that matter | Projects pause after 1 week of inactivity; 500 MB DB; 1 GB storage | Compute auto-suspends (cold start ~0.5–1 s); 0.5 GB per branch |
| Lock-in | Higher (auth + storage + realtime APIs) | Lower (plain Postgres + library) |

Criteria that hold for either option:
- **Auth** with owner/manager/staff roles; owner invites staff (link/OTP); sessions, logout, revocation. Bearer test tokens removed.
- **Multi-tenancy:** RLS enabled on **every** table, keyed off the authenticated user's business membership. The app connects with a non-owner role. Privileged keys are server-only.
- **Onboarding:** create business → menu items with price → recipes per plate (ingredient, qty, unit, cost) → staff invites → Paystack connection (test mode).
- **Config to DB:** thresholds (10 %, ₦5,000, ₦2,000, 35 %, ₦50 rounding) per business in a `business_settings` table with these defaults.
- Schema stays in versioned migrations (`db/migrations/`); seed creates **only** the simulated restaurant.

**Acceptance:** two test businesses; automated tests prove a user in A gets 0 rows / 403 for every B resource on every route **and** directly against the DB with RLS (no app-code filtering). Onboarding to first recorded sale in under 10 min for a new owner.

## M2: Core product hardening

- Ingestion: retries with backoff, voice processed in background (upload → job → result), timeouts, `needs_review` on any failure. (Idempotency key done in M0.)
- Extraction eval suite: the 20 baseline messages + ≥30 more Pidgin/Yoruba/code-switched cases. Pass = item, quantity, unit, amount all correct. Report per-language accuracy. (Ask before any large eval run; the 200/day cap applies.)
- Rule engine: fixed fixtures; edge cases (zero stock, negative gaps, missing prices, Lagos midnight).
- Paystack webhook: event log table, unknown references stored as unmatched (200), reconciliation job.
- Realtime updates with polling fallback.
- 9pm WAT daily summary: profit, unmatched money. AI wording passes the number check, else template.
- Playwright E2E of the full loop in CI.

**Acceptance:** eval ≥ 90 % pass overall, per-language reported; duplicate webhook deliveries ×5 → 1 payment; E2E green in CI; summary numbers equal a hand-computed fixture.

## M3: Production readiness

Structured logs; error tracking (free tier); rate limiting per user/IP; zod validation at every boundary; automated backups + one restore drill; NDPA basics: privacy policy and terms with the real controller identity, retention periods, deletion/export flow, explicit consent for voice data, data minimisation review.

**Acceptance:** restore drill documented; deletion request completes end to end; no route accepts unvalidated input (checked by test); alerts fire on 5xx spikes.

## M4: Business model

Subscription billing via Paystack **test mode only** (plans, trial, renewal webhooks, dunning, cancellation). Live plans only after Okunola approves.

**Acceptance:** test-mode subscribe → renew → fail → recover → cancel cycle passes with webhooks idempotent.
