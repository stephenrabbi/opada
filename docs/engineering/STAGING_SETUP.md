# Staging setup (your own free accounts)

How to stand up Opada staging on **your own** Neon (free), Vercel (Hobby), Paystack (test mode) and Gemini key, from a local checkout. Everything is configured by environment variables, so pointing at different infrastructure later (e.g. Herbert's) means changing env vars only. Diff the schema first (step 9).

**Rules:** secrets live only in `.env.local` (gitignored) and in Vercel's encrypted env store. Never paste them into chat, commits, issues or screenshots. Deploy **preview only**: never `vercel --prod`. Paystack stays in **test mode**: the code refuses any key not starting with `sk_test_`.

---

## 0. Prerequisites
- Node 22+ and the repo checked out on the working branch; run `npm ci`.
- Vercel CLI: `npm i -g vercel` (check with `vercel --version`).
- Accounts: Neon (free), Vercel Hobby, Paystack (test mode is enough, no business verification needed), Google AI Studio key for Gemini.

## 1. Create `.env.local`
In the repo root (same folder as `package.json`). It is covered by `.gitignore` (`.env.*`). Confirm with `git check-ignore .env.local`; it must print the filename.

```dotenv
# Neon: Dashboard → your project → Connect → "Connection string" (direct, not pooled), includes ?sslmode=require
DATABASE_URL=
# Google AI Studio → Get API key
GEMINI_API_KEY=
# Optional; default gemini-2.5-flash
GEMINI_MODEL=
# Optional; lower the daily Gemini call cap (hard maximum 200)
GEMINI_DAILY_CALL_CAP=
# Paystack → Test Mode → Settings → API Keys & Webhooks → Test Secret Key (starts sk_test_)
PAYSTACK_TEST_SECRET_KEY=
# Keep false: Google Cloud STT is billed
OPADA_GOOGLE_STT_ENABLED=false
```

Neon tip: pick region **AWS Europe (Frankfurt)**, the closest to Lagos. Postgres 16 or 17 both work.

## 2. Run migrations
```sh
npm run db:migrate
```
It prints `Migrating database on host ep-….neon.tech`. **Check that host is your project** before continuing. Re-running is safe (`Up to date`). Applied migrations are recorded in `schema_migrations` with a checksum. Never edit an applied migration; add a new numbered file.

## 3. Seed the simulated restaurant
```sh
npm run db:seed                       # today's Lagos date
npm run db:seed -- --day=2026-10-23   # a specific day (e.g. Demo Day)
npm run db:seed -- --reset            # wipe and re-create ONLY the simulated restaurant
```
- Creates **OPADA SYNTHETIC TEST RESTAURANT (SIMULATED)**, 3 simulated staff, 7 entries (one deliberately incomplete, `needs_review`), and 3 Paystack **test-mode** payment rows with matching expected references. Transfers reported ₦27,200 vs Paystack ₦23,700 gives a ₦3,500 gap for the transfer rule.
- Fresh bearer tokens for the simulated owner and staff are written to `.seed-tokens.local.json` (gitignored, never printed). Each run revokes the previous seed tokens. Default lifetime 72 h (`SEED_TOKEN_TTL_HOURS`).
- Refuses to run when `VERCEL_ENV` or `OPADA_ENV` is `production`.

## 4. Check locally
```sh
npm run dev
```
Open http://localhost:3000/owner, paste the **owner** token from `.seed-tokens.local.json`, and you should see the seeded entries and three verified test receipts. `/staff` takes a staff token.

## 5. Create the Vercel project and link it
```sh
vercel login
vercel link
```
- **Scope: choose your personal Hobby account**, not Herbert's team (`oluwafemiherbert-9387`).
- "Link to existing project?" → **No** → name it e.g. `opada-staging`. Framework is detected as Next.js; keep the defaults.
- This writes `.vercel/project.json` locally. `.vercel` is gitignored.

## 6. Set environment variables in Vercel
Add each one to the **Preview** environment only. The CLI prompts for the value, so it never lands in shell history:
```sh
vercel env add DATABASE_URL preview
vercel env add GEMINI_API_KEY preview
vercel env add PAYSTACK_TEST_SECRET_KEY preview
vercel env add OPADA_GOOGLE_STT_ENABLED preview     # value: false
# optional
vercel env add GEMINI_MODEL preview
vercel env add GEMINI_DAILY_CALL_CAP preview
vercel env ls                                       # names only; confirm all are under Preview
```
When prompted for a branch, leave it empty (applies to all previews). Env changes only apply to **new** deployments.

## 7. Deploy a preview and give it a stable staging URL
```sh
vercel deploy                 # preview by default. Never add --prod
```
It prints a unique URL like `https://opada-staging-abc123-<you>.vercel.app`. Each deploy gets a new one, so point a **stable alias** at it (free `*.vercel.app` subdomains work on Hobby if the name is free):
```sh
vercel alias set https://opada-staging-abc123-<you>.vercel.app opada-staging-<you>.vercel.app
```
Use the alias everywhere below. **Rollback** = re-point the alias at the previous deployment (`vercel ls` lists them):
```sh
vercel alias set <previous-deployment-url> opada-staging-<you>.vercel.app
```

### Deployment protection (needed for the Paystack webhook)
Hobby previews are behind Vercel Authentication by default, and Paystack can't log in. Keep protection on and use a bypass secret:
1. Vercel → Project → Settings → Deployment Protection → **Protection Bypass for Automation** → generate a secret.
2. The webhook URL carries it as a query parameter (step 8). Treat that full URL as a secret.

Check it works: `curl -s https://opada-staging-<you>.vercel.app/api/health` returns a redirect/401 (protected), and the same URL with `?x-vercel-protection-bypass=<secret>` returns JSON.

## 8. Point the Paystack test webhook at staging
1. Paystack Dashboard → switch to **Test Mode** (toggle at the top) → Settings → **API Keys & Webhooks**.
2. **Test Webhook URL:**
   `https://opada-staging-<you>.vercel.app/api/paystack/webhook?x-vercel-protection-bypass=<secret>`
3. Save. Leave the **Live** webhook URL empty.

End-to-end test (simulated restaurant only):
```sh
# 1. Create a test checkout as the simulated owner. Read the token from .seed-tokens.local.json; don't paste it anywhere shared
curl -s -X POST "https://opada-staging-<you>.vercel.app/api/paystack/test-checkout?x-vercel-protection-bypass=<secret>" \
  -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" \
  -d '{"amount_kobo":150000,"email":"simulated-owner@example.com"}'
```
2. Open the returned `authorization_url` and pay with a Paystack **test card** from Paystack's docs ("Test Payments").
3. Paystack calls the webhook. The handler verifies the HMAC signature, re-verifies the transaction with Paystack, checks the amount against the expected reference, and stores it once.
4. Owner dashboard → Payments shows the new verified test receipt.
5. **Replay check:** Paystack Dashboard → Transactions → the payment → resend webhook. The handler answers `recorded:false`, and there's still one row.

## 9. Switching to other infrastructure (e.g. Herbert's) later
Only env vars change: `DATABASE_URL`, `PAYSTACK_TEST_SECRET_KEY`, `GEMINI_API_KEY`, then redeploy. **Before** running `db:migrate` against an existing database:
```sh
pg_dump --schema-only "$DATABASE_URL" > /tmp/their-schema.sql   # compare with db/migrations/0001_baseline.sql
```
The baseline is `IF NOT EXISTS` throughout, so existing tables are left alone. But column types and constraints that differ won't be changed, and the `payments_paystack_reference_key` unique index will fail loudly if duplicate references already exist. Resolve differences in a new migration and never edit an applied one.

## Variable reference
| Variable | Where | Required | Notes |
|---|---|---|---|
| `DATABASE_URL` | `.env.local`, Vercel Preview | yes | Postgres connection string. The app uses the Neon serverless driver, so it must be Neon for the app; scripts accept any Postgres |
| `PAYSTACK_TEST_SECRET_KEY` | both | for payments | Must start with `sk_test_`; also verifies webhook signatures |
| `GEMINI_API_KEY` | both | for AI extraction | Server-side only |
| `GEMINI_MODEL` | both | no | Default `gemini-2.5-flash` |
| `GEMINI_DAILY_CALL_CAP` | both | no | Lowers the cap. Hard maximum 200/day (Africa/Lagos day) |
| `OPADA_GOOGLE_STT_ENABLED` | both | no | Keep `false` (billed service) |
| `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_STT_LOCATION` | — | no | Only if STT is ever approved |
| `SEED_TOKEN_TTL_HOURS` | `.env.local` | no | Seed token lifetime, default 72 |
