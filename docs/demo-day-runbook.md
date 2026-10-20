# Opada — Team Stack-Mind — Demo Day runbook (20 October 2026)

## Claim only verified functionality
Opada is a test-data restaurant operations application currently deployed as a Vercel preview, **not approved for real financial operations**.

Verified with screenshot/user interaction:
- Authorized synthetic owner token opened the owner dashboard.
- Paystack **Test Mode** processed one simulated NGN 100 card transaction, and Opada independently verified and stored its receipt in Neon via authenticated recovery endpoint (not proven via webhook).
- Owner dashboard showed one verified Paystack receipt (NGN 100), alongside an evidence-linked synthetic margin alert.
- Synthetic staff entry of jollof rice at NGN 1,500 appeared on the owner dashboard marked **Needs review**.
- Existing NGN 48,000 seeded synthetic sale also appears but is not evidence of a verified payment.
- A 35% target gross margin on NGN 1,200 ingredient cost gives a rounded minimum recommended price of NGN 1,850. Costs are synthetic.

## Screen-by-screen walkthrough (4 minutes)
1. **Problem (30 sec):** Restaurant staff reports, inventory usage and Paystack receipts often live in separate places. Owners need a clear, evidence-backed view, not AI guesses.
2. **Staff reporting (55 sec):** Open /staff on latest READY preview. Authenticate with a temporary synthetic token privately, submit a *synthetic* sale (e.g., one jollof rice at NGN 1,500, cash). Explain it is stored for review. Avoid repeated submissions when the demo can use a previously verified record.
3. **Owner dashboard (75 sec):** Open /owner; authenticate privately. Show the review-needed staff report; its value is **not** a verified Paystack receipt. Show the ₦100 verified Test Mode card receipt with reference and timestamp. The payment is not real cash.
4. **Financial insight (45 sec):** Show the synthetic margin-squeeze alert: sample ingredient cost NGN 1,200 at selling price NGN 1,500, 20% gross margin, and proposed price NGN 1,850 to target >=35% margin after rounding. Evidence count is one; no claim of real business impact.
5. **Close (35 sec):** Opada's demonstrated path is staff entry → database → owner visibility, plus separate Paystack Test Mode checkout → direct verification → receipt record. Live customer onboarding, automated reconciliation, webhook reliability, multilingual Gemini extraction and alert delivery remain subject to integration/security testing.

## Essential dry run
- [ ] Latest candidate commit passes Vercel build AND GitHub CI; verify exact SHA.
- [ ] On laptop and Android/iPhone if available, test landing → staff → owner, with zero horizontal scroll.
- [ ] Verify authentication rejection without token and role restrictions.
- [ ] Ensure the synthetic owner token is unexpired (24-hour validity) and stored privately.
- [ ] Demonstrate same existing verified test receipt; do not make another payment unnecessarily.
- [ ] Confirm staff test report appears only for the correct synthetic restaurant.
- [ ] Clear browser session / click Lock at finish; do not share bypass or staff tokens.
- [ ] Keep one fallback screenshot of receipt, report and margin alert for internet disruption.

## Do not claim
- Automatic payment webhook reconciliation proved (the receipt was recovered through direct Paystack verification).
- Live Mahjeq Foods onboarding, real payment processing, actual verified inventory variance, Gemini multilingual E2E, proven <60-second alert latency, or customer adoption/revenue.
- The margin estimate is a confirmed menu-cost recommendation for Mahjeq; it uses synthetic cost inputs.

## Release blockers after Demo Day
Real login and account recovery, verified staff authorization, legitimate customer onboarding, payment provider control, webhook durable delivery, full financial review workflow, backups/restore, privacy/security checks, secrets hygiene and customer acceptance must pass before using real business data.
