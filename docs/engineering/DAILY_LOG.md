# Daily log

## 2026-10-21
- **Done:** Step 0 audit. Read handover, docs, all branches and PR #5; ran install/check/test (52/52)/build (pass); history secret scan clean; wrote AUDIT_2026-10-21.md and ROADMAP.md.
- **Blocked:** No Vercel/Neon/Paystack access (GitHub write only); waiting on decisions D1 (Supabase vs Neon) and D3 (Demo Day option A vs B).
- **Next:** Tag fallback, patch Next.js + commit lockfile, then schema baseline and Option B wiring once access and D3 arrive.

## 2026-10-21 (evening)
- **Done:** Tagged `demo-day-v0-fallback`; Next 15.5.28 + lockfile + `npm ci` (PR #7: 52/52 tests, build, 12/12 smoke incl. webhook); schema reconstructed + `db:migrate` + simulated seed + STAGING_SETUP.md (PR #8); server-side totals + idempotency key (PR #9); Gemini 200/day cap with logging (PR #10). Suite 75/75; migrate/seed and cap concurrency verified on throwaway local Postgres 17.
- **Blocked:** Okunola's own Neon/Vercel/Paystack/Gemini accounts (no deploy until confirmed); B1 Gemini wiring on hold ≤2 h pending check for Herbert's unpushed code.
- **Next:** B1 once released, then B2 rules → flags, B3 owner polling + Mark as checked; must hit the local loop by Thu 22 Oct 12:00 WAT.

## 2026-10-22
- **Done:** Totals check split by source (manual rejects, Gemini saves server amount + review, no price skips) with tests; B2 rules → flags on Lagos-day data (PR #11); B1 message → Gemini → entries + staff quick-message box (PR #12); fixed intermittent wasm out-of-memory test flake. Full suite green repeatedly.
- **Blocked:** Okunola's `.env.local` (Neon, Vercel, Paystack test, Gemini) for migrate/seed/preview deploy; merges held until Herbert's production branch is confirmed (ADR-012).
- **Next:** B3 owner dashboard (polling, Mark as checked, evidence drill-down) to hit the local-loop checkpoint Thu 22 Oct 12:00 WAT; then STAGING_SETUP.md on Okunola's accounts.

## 2026-10-22 (afternoon)
- **Done:** Found the first DATABASE_URL was a pre-existing (Herbert-style) DB, stopped, reported; moved to a claimable Neon DB (empty-checked), migrate + seed OK; real-Gemini loop: when Gemini answered, message → flag → one-tap took 11.9–23.7 s; Gemini default model fixed (2.5-flash 404), fallback retry added, seed reset fixed. 12:00 checkpoint **missed** (wall clock) and the loop is **not reliable yet** because Gemini free tier returned 503s.
- **Blocked:** Gemini free-tier capacity (decision D6); Vercel + Paystack test accounts for staging; possible rollback of schema changes on the first database (needs owner decision).
- **Next:** on D6 = Vertex AI, wire the provider behind src/ai.js and re-run 3 timed loops; B3 owner dashboard (polling, Mark as checked, evidence); staging deploy once Vercel is ready.

## 2026-10-22 (evening)
- **Done:** B3 owner dashboard (5 s auto-refresh, New highlight, Mark as checked, evidence view; PR #13; 129/129 tests; browser journey on 4 viewports). Staging live on Okunola's Vercel (fra1, protected) before the 21:00 cut-off; works end to end except Gemini free-tier 503s. Fallback backoff 1.5 s + time budget. Local-demo runbook. Backup video recorded (36 s, side by side, clean take). Incident record + rollback script for Herbert's DB (tested on a stand-in, **not run**). Review of Herbert's work (MAIN_REVIEW.md): his auth is on PR #5's branch, not main; nothing breaks from our schema changes; live site runs unpushed code.
- **Blocked:** Gemini paid tier (Okunola linking billing tonight) for reliable extraction and the 3 timed loops; Herbert's answers (production branch, unpushed code, schema dump).
- **Next:** when billing is on, 3 timed loops on staging (English, Pidgin, Yoruba), then re-record the video if needed; demo rehearsal from LOCAL_DEMO_RUNBOOK.md; tag demo-day-v1.
