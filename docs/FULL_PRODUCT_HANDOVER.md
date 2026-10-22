# OPADA — FULL ENGINEERING HANDOVER & LIVE-PRODUCT ROADMAP
**Prepared:** 21 October 2026 | **Project:** Opada | **Team:** Stack-Mind | **Scope:** Whole product, not Demo Day

> **Read first:** Opada is currently a synthetic-data prototype. It has NOT been approved for real customer financial information, live payment collection or production onboarding. This document is an engineering handover, not a claim of security, legal or payment compliance. Founders plan to register Opada as a standalone Nigerian company; incorporation is not yet complete.

## Verified co-developer access audit — 21 October 2026

**Collaborator:** GitHub user `Okun15Ola` (displayed as Okunola Olubanjo in repository settings). Access was checked directly, not inferred from invitation status.

| System | Verified state | Required action by service administrator |
|---|---|---|
| GitHub `stephenrabbi/opada` | **WRITE** permission confirmed | Continue development through branches/PRs; repo remains personally owned |
| Vercel Opada team `team_ArQMTEz54qbqyzht3cwoV3KV` | Only current founder/owner account was returned in membership list | Invite partner through Vercel Team Settings → Members; confirm project access and permissions |
| Neon `falling-rice-41327078` | Only current founder/admin account was returned in project-member list | Invite partner through Neon project's Members/Permissions interface; scope database access appropriately |
| Paystack | Not checked / unknown | Confirm official team-member invitation independently; do not share personal passwords or live keys |
| Figma | Not checked / unknown | Confirm editable access to Opada design file independently |

**Safety:** No credentials were disclosed, permissions were changed, or ownership transferred during this audit. Do not put passwords, tokens, connection strings or two-factor recovery codes in this file. Partner cannot be assumed to have deployment/database rights from GitHub access alone.

## 1. Canonical links, version and access
- GitHub: https://github.com/stephenrabbi/opada
- **Current working branch:** `feature/paystack-free-checkout`; review PR https://github.com/stephenrabbi/opada/pull/5
- Protected **development preview** from last verified READY build: https://opada-owsfhe89k-oluwafemiherbert-9387.vercel.app/
- Production hostname: https://opada.vercel.app/ — **NOT** verified to contain the development branch. Do NOT claim it is updated or production-ready.
- Repo default `main` still represents an older code state. Do not blindly merge without release gates.
- Figma design (desktop/mobile concepts): https://www.figma.com/design/D6OvW5O0yRpHZ6DbCt1Nim
- CI: https://github.com/stephenrabbi/opada/actions and .github/workflows/ui-screenshots.yml
- Legal centre on preview: `/legal`. Routes: `/staff`, `/owner`, `/api/me`, `/api/ingest`, `/api/entries`, `/api/flags`, `/api/paystack/receipts`, `/api/voice` and other checkout routes.
- Previous GitHub Actions checks passed at commit `469c89a402f1bb4841e89cfdeaa7527be451a416`; full preview SHA `b36e9d94fe3cf67f7992d09584ba2e8a452f06f5` showed READY. Verify new commits afresh.

## 2. Access handoff (do NOT transfer personal passwords)
The founder authorizes the co-developer to perform engineering work and recommends independent role-based access. This text does **not** itself confer permissions; invitations must be issued inside each provider by a current authorized administrator.
1. GitHub: confirm invitation accepted, verify repository permission (Write/Maintain, or Admin if he must own settings, secrets, branch protections). Require two-factor authentication. Request reviews via PRs; protect main.
2. Vercel: invite co-developer to the Opada team/project with sufficient deploy/environment access (project/team administrator only if truly needed). Ensure preview SSO access. Keep production promotion controlled until go-live sign-off.
3. Neon: invite his **own** Neon account to the Opada project, preferably separate development/staging/production branches and separate DB roles; allow admin permissions only if migrations/ops require it. Do not share DATABASE_URL containing broad production credentials via messages.
4. Paystack: use official team-member permissions or dedicated test credentials, with least privilege; keep TEST and LIVE key sets separate. Do not share the founder's Paystack login, 2FA or recovery codes.
5. Google Cloud/Gemini: separate authorized project access only if required; do not enable paid services without explicit founder approval. `OPADA_GOOGLE_STT_ENABLED` **must remain false**. Use free browser voice and typed input by default.
6. Figma: invite as editor to the file/team using his own account. Domain/DNS, official company email, monitoring, support inbox and future billing/analytics accounts each need separate owned access.
7. Secrets: use Vercel/Neon/Paystack secret stores. Never put plaintext secrets in commits, docs, support messages, screenshots or chat. Rotate any leaked or unnecessarily shared credentials. Record secret NAMES and owners only in handoff; not values.
8. Founder remains informed: changes to costs, financial settlement, production credentials, destructive DB migrations, irreversible data deletion, and go-live require explicit founder approval. A full developer role does not require sharing passwords or removing every safety restriction.

## 3. Already implemented — distinguish code from verified operation
**UI/UX:** Next.js 15 + React 19 responsive homepage, staff portal, owner dashboard; desktop sidebars, mobile nav; Figma-inspired design; legal footer and six legal pages. Tested with 1440x900 desktop, 820x1180 tablet, 390x844 iPhone-size, 360x800 Android-size in Playwright. These are browser viewport simulations, NOT physical device certification.

**Backend/data:** Neon PostgreSQL; hashed bearer-test-token authentication; staff roles; business-scoped reads; staff report `/api/ingest`; owner transaction and flag endpoints. Test-only synthetic business and entries. Existing form includes sale, expense, restock, stock count, quantity, whole-naira price, and unverified cash/transfer status.

**Payment evidence:** Paystack **TEST** checkout and server-side verification of test receipts were exercised earlier. Staff-reported transfer != provider-verified payment; settlement, automatic webhook reconciliation, live Paystack account and real bank transfers are NOT validated.

**Insights:** deterministic rules under `src/rules.js`, `src/process.js`; margin/stock/reconciliation examples. No guarantee against fraud or missing records. Preserve evidence provenance and explain all flags.

**Voice and AI:** Web Speech API browser transcription selector for English, Yoruba, Igbo, Hausa, experimental Pidgin English fallback; manual review of spoken reports; conservative English/Pidgin-style extraction in `src/voice-report-extract.js`. Google Cloud STT V2 proxy `/api/voice` is implemented but DISABLED by default to avoid billing; its language/model compatibility and live transcription have not been proven. Gemini extraction code exists but not verified end to end. Do not claim 5-language accuracy or autonomous financial decision-making.

**Testing and delivery:** `npm run check`, `npm test`, `npm run build`; CI browser screenshots; mocked authorized owner/staff journeys. These tests use fixtures and do not establish production safety, operational accuracy or real-money settlement.

## 4. Architecture and immediate developer orientation
- `app/page.jsx`: marketing landing; `app/staff/page.jsx`, `app/staff/VoiceReport.jsx`: staff and browser speech UI; `app/owner/page.jsx`: owner workspace.
- `app/api/**`: Next.js API routes; `src/staff-auth.js`, `src/token-auth.js`: token auth; `src/ingest-schema.js`: validation; `src/rules.js`, `src/process.js`: deterministic engine; `src/voice-report-extract.js`: conservative parsing.
- `app/legal-content.js`, `app/legal/**`: drafted legal information.
- `test/**`, `scripts/ui-screenshots.mjs`, `scripts/ui-authenticated-qa.mjs`: regression automation.
- `npm install && npm run check && npm test && npm run build`; use Node >=22. `npm run dev` for local UI. Prefer add and commit a lockfile for reproducible CI after dependency audit.
- Audit every `app/api` route, schema migration, test fixture and environment variable on joining; never assume endpoints are complete merely because a UI link exists.

## 5. Remaining work to an actual customer-usable product (ordered by dependencies)
### Phase A — Ownership, safety baseline, engineering discipline
- Confirm collaborator permissions and production governance; inventory services, permissions, branches, deployment aliases, costs, secrets and recovery access. Enable 2FA and rotation.
- Audit repo/dependencies and supply-chain security; lockfile, lint, TypeScript migration strategy, CI tests, staging and production branch rules, CODEOWNERS, changelog, release process.
- Threat model financial and personal data flows; protect sensitive APIs, strict authorization per tenant, rate limiting, request-size limits, CORS/CSRF as appropriate, structured error handling, audit logs, vulnerability scanning and monitoring. Check voice upload types/content, duration, authentication and abusive usage.
- Document architecture diagrams, API contracts, database schema, environment matrix and backup/recovery plan. Do not enable production or weaken auth to make demos easier.
**Gate:** reproducible staging release and security test plan, access owned by named individuals.

### Phase B — Real identity, tenancy and organization administration
- Replace manually distributed long-lived synthetic bearer tokens with standard secure login/onboarding (email + secure password or passwordless; MFA for owners, secure server sessions, resets, revocation, device/logout policies).
- Model organization/restaurant, branches, owner/manager/cashier/kitchen/stock/auditor; invitations and staff lifecycle; granular RBAC, audit of privilege changes.
- Enforce tenant isolation across every read/write/file/speech/checkout route and database query; test IDOR, forged owner IDs, privilege escalation and cross-tenant visibility. Prefer DB-enforced RLS or equivalent policy and scoped service credentials.
- Owner onboarding with business verification, branch setup, opening balances, units, tax configuration, staff onboarding, consent and acceptance of finalized policies.
**Gate:** two independent test restaurants, isolated staff, recovery, permissions and authenticated usability across devices.

### Phase C — Daily restaurant operations
- Finalize item catalogue, categories, unit measures, menu variants, suppliers, ingredient recipes/BOM, purchase orders, goods receipt, stock adjustments, waste/spoilage and inventory movement ledger.
- Reliable POS/staff transaction entry (cash, transfer, card, split payments, voids/refunds, discounts, returns, offline/poor-network handling and idempotent sync). Corrections preserve immutable history and original evidence.
- Shift opening/closing, tills/cash reconciliation, daily sales summaries, receipts, and owner approval/rejection of staff reports with review reasons.
- Clarify currency/kobo handling, numeric rounding, dates/timezone, duplicate detection, attachments and clear audit trail.
**Gate:** a real operational day can be entered and reconciled in staging without impossible states.

### Phase D — Payments and financial integrity
- Decide product boundaries (analytics vs payment collection). Agree merchant-of-record/settlement/refund responsibilities with Paystack and an appropriate adviser.
- Production Paystack integration only after test and compliance approval: signature-verified idempotent webhooks, retry/replay handling, reference uniqueness, refunds/reversals/chargebacks, settlement status, failed/partial/duplicate payment handling, audit records.
- Never equate a screenshot, staff transfer claim or Paystack test receipt with settled actual money; model verified provider status separately from bank settlement.
- Independent bank transfer reconciliation requires lawful authorized bank feeds/statement imports; do not claim it works until implemented.
- Reporting: date/branch filters, gross/net sales, COGS and margin from ingredient costs, stock variance, verified vs claimed payments, receivables, cashflow limitations, exports, downloadable reports and evidence drilldown.
**Gate:** end-to-end synthetic and controlled approved test payment lifecycle, plus independent finance reconciliation review.

### Phase E — Multilingual voice/AI and accessibility
- Retain **free-first** constraint. Keep optional Google STT V2 disabled unless founder authorizes billing; no hidden subscriptions or automatic charges.
- Evaluate Nigerian English, Yoruba, Igbo, Hausa and Nigerian Pidgin with consented synthetic recordings across common Android phones, iPhone/Safari and laptops. Report actual language-specific error rates, model limitations and latency; fallback to typed input.
- Build a safe extraction pipeline: transcript -> proposed typed fields -> clear confidence/unknown -> edit/confirm -> record as unverified; prevent automatic verified payment status, fraud allegations and unsupported calculations.
- Properly support mixed payment splits, Nigerian currency numerals, local terminology, code-switching, noisy kitchens; add regression corpora reviewed by speakers.
- Accessible touch targets, contrast, screen reader labels, localization and intermittent-network UX. Review voice privacy, retention and third-party processing before real use.
**Gate:** objective per-language validation; no false claims of five-language support.

### Phase F — Production platform, support and commercial setup
- Define free/paid tiers, subscription/billing (only after approved provider setup), invoicing, trials, cancellation, refunds, tax, receipts, dunning and financial reconciliation of the platform's own revenue.
- Live customer support: help centre, onboarding wizard, FAQs, contact escalation, bug reporting, terms acceptance, support SLAs, staff training materials and in-product tours.
- Dev/staging/prod separation with least-privilege secrets, migration management/rollbacks, monitored cron/jobs/webhooks, database backup restore drills, telemetry, alerts, error budgets, security incident playbooks and disaster recovery RPO/RTO.
- Performance and affordability for Nigeria: low-end mobile, intermittent connections, bandwidth-efficient pages, caching, multi-branch scaling, security load and failure tests. Budget explicitly approved before any metered services.
- Analytics with privacy safeguards; feature flags, gradual rollout, operational dashboards and security review.
**Gate:** a supported customer can onboard, use, export, request deletion, get help, and leave without loss or unauthorized disclosure.

### Phase G — Corporate, data protection, legal and actual go-live
- Incorporate Opada separately via CAC and agree founder equity, IP assignment to company, contracts and corporate bank/accounting arrangements.
- Confirm controller/processor roles; comply with Nigeria Data Protection Act, applicable NDPC guidance/registration thresholds, records of processing, retention rules, processor contracts, cross-border safeguards, subject rights, breach response and DPIA where required. Obtain qualified local legal review.
- Replace prototype policies with verified registered company name/address/contact, real data categories and processors, lawful bases, cookie audit, notice acceptance, commercial terms, cancellation/refund and complaints contacts.
- Security/privacy audit, penetration testing, data separation, incident exercises, merchant/payment compliance and operating procedures. Avoid suggesting certification that has not been obtained.
- Controlled pilot with explicitly approved restaurants, informed user consent, support/feedback and rollback. Define success metrics: accurate reconciliation, reduction in unexplained gaps, time saved, voice transcription errors, support tickets and retention.
- Founder signs production go-live checklist. Then deliberately merge/release from tested version, set domains and monitoring, enable only approved production secrets; verify live user journeys and provide support.

## 6. Suggested issue backlog, work ownership and deliverables
| Priority | Epic | Evidence required to close |
|---|---|---|
| P0 | Access and secrets ownership | named collaborators, 2FA, secrets inventory without values, confirmed branch protections |
| P0 | Security/tenant audit | tests proving cross-tenant and cross-role requests blocked |
| P0 | Real authentication and recovery | account creation, MFA for privileged roles, safe recovery/logout, security review |
| P0 | Data model/migrations and staging | versioned schema, deterministic fixtures, backup/restore rehearsal |
| P0 | Financial evidence semantics | claimed/verified/settled status separated, idempotency, reconciliation invariants |
| P1 | Operations and stock ledger | unit, recipe, inventory and shift tests |
| P1 | Owner approval and audit | approval/rejection, immutable events, reason and audit actor |
| P1 | Payment lifecycle | simulated webhook, duplicates, refunds and failure tests |
| P1 | Multilingual speech | consented benchmark, accurate fallback and confirmation UX; free-first |
| P1 | QA, accessibility, mobile | automated plus physical devices, security load and offline checks |
| P1 | Privacy/legal/support | counsel-reviewed agreements and working contact/request flows |
| P2 | Pricing/billing/admin | agreed model, no unapproved paid dependencies |
| P2 | Pilot and staged release | signed-off pilots, telemetry, rollback, go-live sign-off |

**Working process:** co-developer opens issues and works in short PRs; attaches tests, screenshots, migration/rollback notes, security implications, costs and review evidence. Do not modify live money handling without two-person review. Founder may be unavailable today; independent progress is encouraged but production activation and spending are reserved.

## 7. Definition of done for "customer usable"
ALL must be true, not merely a passing build:
- Multi-tenant secure sign-in, role-limited permissions, staff lifecycle and recovery proven.
- Restaurant can complete daily real operational workflows with accurate, traceable ledger and approved reconciliation.
- Payments clearly reflect actual provider verification and bank settlement where applicable; callbacks are secure/idempotent.
- Data is backed up, restorable, exportable and deletable within lawful constraints; requests and breach procedure operational.
- Mobile/desktop accessibility, performance and real-device support demonstrated.
- Full Nigerian legal/operator identity and privacy/commercial obligations verified; external service agreements in place.
- Logs/monitoring/alerts, support, billing if applicable and rollback operational; tests and security review passed.
- Controlled pilot feedback resolved and founder approves production release.

## 8. Questions to resolve early (do not guess)
Company legal name and ownership, technical lead's GitHub username, exact access roles, business model and who receives funds, first target restaurant workflows, permissions to use customer voice/data, paid-service budget (currently **NO PAID GOOGLE CLOUD**), preferred support/privacy email, retention periods, required offline mode and go-live date. Track decisions in GitHub issues or `docs/decisions/`.

## Free-plan deployment policy — verified 22 October 2026

**Decision: DO NOT create a GitHub Actions job that deploys partner-authored commits using the founder's Vercel credential to bypass Hobby collaboration restrictions.** Vercel's official guidance requires the Hobby team owner to be the commit author for deployments to that team. Hobby is for personal/non-commercial projects; do not assume it permits Opada's future commercial customer deployment. References:
- https://vercel.com/docs/deployments/troubleshoot-project-collaboration
- https://vercel.com/docs/git
- https://vercel.com/docs/plans/hobby

**Supported work today:** Okunola `Okun15Ola` has GitHub Write, Neon `opada` project Editor, Paystack Developer Support (screenshot shows 2FA enabled), and Figma invitation reported sent (edit rights not independently verified). Vercel membership audit showed only founder account.

**Workflow:** partner develops in feature branches, opens PRs, runs `npm run check`, `npm test`, `npm run build`, and inspects GitHub Actions logs and screenshots. Existing `.github/workflows/ui-screenshots.yml` uses synthetic data and mocks. No live deploy, secrets transfer, production promotion or backend spending is authorized by this workflow.

**Deployments:** Vercel previews of commits by non-owner may be blocked on Hobby. Preserve a green CI/build report as the verification artifact. A founder-authorized production deploy requires an approved compliant hosting setup and release gate; don't rewrite Git author metadata or put founder Vercel token into GitHub Actions as a workaround. If necessary evaluate other providers with explicitly permitted free team development, but confirm limitations and non-commercial restrictions before committing.

**Operating note:** the current service remains a synthetic-only prototype; customer use requires proper production hosting, risk/security/legal review and founder approval. The collaborator may make code/DB development progress independently without Vercel deployment privileges.

## Development increment — 22 October 2026: read-only tenant-scoped team API
- `GET /api/team` introduced on development branch. Requires current synthetic bearer-token authentication and `owner` or `manager` role; ordinary staff requests are denied.
- Query always scopes to `staff.business_id` resolved server-side from authorization, never to a supplied customer or business selector. Response contains only id, display name, role, active status and created timestamp. No token hashes or auth subjects returned.
- Tests for role restrictions, malformed business scope, and rejecting cross-restaurant selectors are in `test/team-access.test.js`. This is a **preparatory endpoint**, not production-ready staff onboarding, invitation or sign-in.
- Still required: true secure account identity, MFA, session management, account recovery, owner-approved staff invitations, privileged audit logs, DB authorization/RLS or equivalent defense-in-depth, and integrated two-restaurant isolation testing. No customer data should be introduced.

## Development increment — staff invitation primitives (22 October 2026)
- Added `src/staff-invitation.js`: validates normalized invitee email and limited roles, allows only owner to initiate, rejects injected restaurant/staff identifiers, generates cryptographically random 256-bit invitation secrets, stores/compares only SHA-256 digests and defaults to 48-hour expiry.
- Added `test/staff-invitation.test.js` regression coverage.
- **Not enabled or connected to a live endpoint**: invitation links, mail delivery, one-time database token consumption, verified email ownership, session issuance, owner audit trail, rate limiting, revocation and complete customer login are not implemented. Do not invite real people or accept real credentials through the synthetic preview.
- Next engineering work: design a migration and transactional redemption flow with tenant binding, uniqueness and revocation, followed by controlled tests on a disposable Neon branch before wiring any routes.
