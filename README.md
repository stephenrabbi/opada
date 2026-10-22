# Opada — Restaurant Intelligence

**Co-developer:** Start with the [full engineering handover and customer-ready roadmap](docs/FULL_PRODUCT_HANDOVER.md). It covers access, current capabilities, architecture, all remaining production work, safety gates and definition of done.

**Team Stack-Mind** | Restaurant-first financial visibility and operational reporting for Nigerian food businesses, with possible later expansion to other hospitality operators.

> **Development preview — synthetic test data only.** Opada is an evolving prototype, not an approved live financial-operations platform. Do not enter real customer information, payment credentials, or financial transactions.

## Try the latest development preview

- [Homepage](https://opada-pln2r2ryc-oluwafemiherbert-9387.vercel.app/)
- [Staff reporting](https://opada-pln2r2ryc-oluwafemiherbert-9387.vercel.app/staff)
- [Owner dashboard](https://opada-pln2r2ryc-oluwafemiherbert-9387.vercel.app/owner)
- [Open development PR #5](https://github.com/stephenrabbi/opada/pull/5)

The above links point to an identified READY development build. Preview deployment URLs are immutable; subsequent commits create new preview URLs. Vercel Deployment Protection may require access to the project's team. The staff and owner portals require authorized **synthetic test tokens**; do not share credentials in source control or chat. The public production domain https://opada.vercel.app is **not** the latest development build.

## Purpose and workflow

Opada aims to help restaurants distinguish **staff-reported activity** from **independently verified payment evidence** and surface actionable operational exceptions:

1. **Ingest** — authorized staff report sales, expenses, restocks, or stock counts. Original notes and claims are stored for review.
2. **Verify** — separately retrieve authenticated, Paystack-verified **test-mode** receipts. Reported transfers are *not* automatically treated as received payments.
3. **Act** — use deterministic checks for stock-versus-sales discrepancies, transfer-versus-verified-receipt differences, and menu ingredient-margin signals. Missing supporting evidence is not silently treated as zero.

## Current development implementation

- Next.js 15, React 19, Neon Postgres-backed authenticated staff reporting and owner queries.
- Role-scoped owner/manager reports, hashed bearer-token authentication, and business-scoped records.
- Synthetic entries marked for review; authenticated owner screens for Overview, Transactions, Payments and Insights.
- Paystack **test-mode** hosted checkout initialization and independently verified synthetic payment receipts. One test checkout/reconciliation was previously exercised; webhook end-to-end delivery and production readiness remain unverified.
- Gemini-assisted extraction code exists in the development branch but an end-to-end demonstration is not confirmed.
- Responsive homepage, staff portal and owner dashboard, with desktop sidebars and mobile navigation.
- Automated Node.js tests, application build verification, Playwright screenshots of the homepage and unauthenticated portals at 1440×900, 820×1180, 390×844 and 360×800, and **mocked** authenticated staff/owner browser journeys. Mocked test responses do **not** establish live payment or database correctness.


## Legal documents and compliance status

The development preview contains a [Legal Centre](/legal) with [Privacy Notice](/legal/privacy), [Terms of Use](/legal/terms), [Cookies and Technology Notice](/legal/cookies), [Acceptable Use Policy](/legal/acceptable), [Financial and AI Disclaimer](/legal/disclaimer), and [Data Rights and Complaints](/legal/rights). The pages are intended for **synthetic development access**, not an assertion that all statutory requirements are already satisfied.

**Must be confirmed before real customers or personal financial records are onboarded:** the registered operator/controller name and business contact, working privacy/security and complaints channels, the controller–processor arrangements, lawful bases and data inventory, cookie audit, retention/deletion periods, cross-border transfer safeguards, incident response, NDPC registration/DPIA assessment where required, and any commercial pricing/refund/contract terms. Obtain review from a suitably qualified Nigerian legal and data-protection adviser.


## Google Cloud speech recognition (opt-in, not activated)

The staff voice interface now offers a **Google Cloud Speech-to-Text V2** mode behind the server-side flag `OPADA_GOOGLE_STT_ENABLED=true`. It remains disabled by default to prevent unexpected costs; the existing browser recognition and typed reporting remain available. V2 is **not** the 60-free-minutes V1 offer. Google V2 standard recognition is usage-billed, and Google Cloud billing, credentials, quota alerts and an explicit spending cap/operational approval must be configured before enabling it.

Backend-only configuration: `GOOGLE_CLOUD_PROJECT_ID`, optional `GOOGLE_STT_LOCATION=us-central1`, and Google Application Default Credentials/service-account credentials stored as Vercel secrets—not as client-side `NEXT_PUBLIC_` values or committed files. Ensure the enabled Google Cloud Speech-to-Text V2 API is authorized and the Google identity has the minimum required permissions. Never commit or paste service-account JSON. Transcription requests require a valid synthetic staff token and impose an audio size limit. This is **not live-tested** against Google's API.

Google V2 mode targets English (Nigeria), Yoruba, Igbo and Hausa as supported by an appropriate chosen model/region, subject to validation. **Dedicated Nigerian Pidgin is not asserted as supported**; Pidgin remains an experimental browser English fallback. Audio recording uses MediaRecorder; a browser/device may not produce an accepted format. All reports remain editable and unverified before submission.

## Developer quick start

Requires Node.js >= 22.

```sh
npm install
npm run check
npm test
npm run dev
```

Use `npm run build` for a production-mode compile. Browser UI tests are run in [GitHub Actions](https://github.com/stephenrabbi/opada/actions) through `.github/workflows/ui-screenshots.yml`; they use a locally started app and synthetic API fixtures.

Environment configuration for database, Paystack, and Gemini features must use secrets management. Never commit credentials. Do not substitute live Paystack keys for test keys in the synthetic test environment.

## Status and release boundaries

- **Development branch:** `feature/paystack-free-checkout` (work in progress).
- **Review:** [PR #5](https://github.com/stephenrabbi/opada/pull/5) (development changes not yet merged to `main`).
- **Deployment:** Vercel preview successfully built; the production domain is not claimed to contain these changes.
- **Remaining gates:** partner review, physical device checks, Figma comparison, controlled live authenticated synthetic end-to-end verification, and production security/operations sign-off.

This README describes the development branch. The default `main` branch is older until PR #5 is reviewed and merged.

**Corporate structure decision (21 October 2026):** Opada is intended to be registered as a **standalone company**. Registration is not yet complete, so no company registration number, incorporation status, or final legal entity name is claimed. Update all legal policies and contracts once official CAC registration particulars and company contacts are available.
