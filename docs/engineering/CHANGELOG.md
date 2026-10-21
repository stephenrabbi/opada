# Changelog

## Unreleased
- docs: engineering audit (2026-10-21), roadmap M0–M4, daily log, decisions log (#6).
- chore: Next.js 15.5.28 (critical advisory fix), committed lockfile, CI uses `npm ci` (#7).
- feat(db): baseline schema reconstructed from code, `npm run db:migrate`, `npm run db:seed` for the simulated restaurant, staging guide (#8).
- fix(ingest): server recomputes entry totals; idempotency key prevents double-tap duplicates (#9).
- feat(gemini): hard cap of 200 calls per Lagos day with logging and a clear 429 (#10).
