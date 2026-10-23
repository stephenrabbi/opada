# Opada funder-demo release gate

This is a release checklist, **not** authorization to migrate a production database.

## Scope and source
- Candidate branch: `integration/hospitality-auth-operations-20261022`, containing partner work from `feat/owner-dashboard-loop`.
- Public website: `https://opada.vercel.app`.
- Demonstration route: `/demo`. It uses synthetic, browser-local records and does **not** connect to Neon, Paystack, or Gemini.
- Existing real-data APIs are **not** authorized for public testing until reviewed separately.

## Required checks before production deployment
1. Confirm the **exact** release commit with passing GitHub `Verify Opada rules and app` and UI checks.
2. Review the changes relative to `main`, including authentication routes, ingests, dashboards, migration files, dependency lockfile, and scope controls.
3. Run `npm run db:preflight` **only against an explicitly identified isolated staging database**. Do not point this command at production when testing.
4. Review preflight output. If `baselineRisk`, `modified`, or `unknown` are present, **STOP** and reconcile against a schema-only backup; do not force migration.
5. If the live Neon schema must change, verify a current backup and restore plan; migrate staging first and smoke-test there. Production migrations require a separate explicit decision.
6. Keep `OPADA_SESSION_LOGIN_ENABLED` and `OPADA_SESSION_READ_ENABLED` unset/disabled until a real verified identity provider and trusted-edge rate limits are in place.
7. Deploy an exact Git commit using the production environment (do not promote a preview while assuming the environment is identical). Verify deployment reports READY and the expected commit.
8. Test public `/` and `/demo` on the actual production alias. Verify navigation, hotel/café switching, one synthetic transaction, alert review, and mobile layout.
9. Do not enter real customer information in the synthetic demo. Confirm no external transaction, payment, or model API calls originate from `/demo`.
10. If an unexpected regression occurs, roll back to the prior known-good production deployment.

## Current limitations
- Funder demo is interactive **simulation**, not evidence that a real Paystack settlement or AI model was exercised.
- Partner's feature branch and the integration branch were not yet merged into `main` when this document was authored.
- Vercel's API deployment quota has previously blocked production deployment; a READY preview is not production.
- Never publish database credentials, tokens or schema dumps in a funding demonstration.
