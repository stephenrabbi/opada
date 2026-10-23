# Opada collaborative deployment gate — 23 October 2026

## Co-developer review
PR #15 review by `Okun15Ola` on 23 October 2026: integration is aligned with the team's intended work. Co-developer requested **no merge to `main` until after Saturday's demo**, a restriction/removal of a bot workflow that pushes lockfile commits, confirmation of the production branch and a jointly agreed deployment plan. Partner is separately testing a preview and will share timed-loop results. Review state is `COMMENTED`, **not approved**.

## Required before release
- [ ] Await partner's separately tested timed-loop results and resolve issues.
- [ ] Identify the **exact** lockfile-writing workflow, its triggers, token permissions and branch targets. Disable automatic commits to `main`; prefer a manual PR or read-only `npm ci`. Do not disable unrelated CI based on an unverified filename.
- [ ] Agree with both contributors: target branch, merge timing after Saturday's demo, staging/production environment assignments, rollback owner and support.
- [ ] Keep PR #15 in draft; do **not** merge automatically or promote preview onto live domain.
- [ ] Ensure the initial public funder demo remains synthetic and explicitly labelled. Keep public login features disabled until issuer/audience/JWKS, production database migration approval and cross-tenant checks are verified.
- [ ] Re-run release CI after the final partner fix; validate deployed commit SHA and correct production environment.
- [ ] Audit main Neon schema and take a recoverable backup before any real production database migration. Existing staging QA rows are isolated; do not delete without authorization.

## Branch and release proposal (awaiting partner agreement)
1. Use `integration/hospitality-auth-operations-20261022` as the review candidate; `main` stays untouched.
2. Conduct the Saturday demonstration using the already verified safe preview or local synthetic demo, avoiding production data.
3. Receive approval and timed-loop test evidence from the co-developer.
4. Apply verified migration plan in staging; address release issues.
5. Only then merge reviewed integration into `main`, with a production build on Vercel and post-deployment smoke tests of homepage, demo, auth-disabled state and telemetry.
6. Roll back the deployment if unexpected account access, tenant mixing, financial inconsistency or deployment errors occur.

This document is a proposed plan, not proof that the co-developer approved production deployment.
