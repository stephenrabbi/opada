# Paystack connection checklist — Opada / Mahjeq Foods
**Current status:** TEST MODE integration implemented in code but not connected to a Paystack account. Do not claim live payments or verified receipts until real end-to-end tests pass.

1. Owner of the intended Paystack merchant account signs in at https://dashboard.paystack.com/.
2. Under **Test Mode → Settings → API Keys & Webhooks**, locate the **test secret key**. Do not share it by email, chat, GitHub or screenshots.
3. In Vercel project Opada → Settings → Environment Variables, create `PAYSTACK_TEST_SECRET_KEY` as a sensitive variable for the specific Paystack test preview branch.
4. Rebuild that preview. The endpoint is `POST /api/paystack/webhook`. Add the publicly accessible preview webhook URL to the merchant's Paystack **test-mode** webhook configuration.
5. Before a test payment, seed a synthetic business-approved `paystack_expected_references` mapping for the exact reference/amount. Never use customer personal data.
6. Execute a genuine Paystack test payment using official Paystack test fixtures, verify `charge.success` receipt, check saved record and replay the event for idempotency.
7. Verify invalid signature, wrong reference, wrong amount, wrong business, incorrect currency, and live-mode event rejection.
8. Confirm the merchant account's actual integration approach with Mahjeq: Paystack checkout/transfer channels are verified; ordinary bank transfers not processed by Paystack must not be represented as Paystack-verified.
9. **Live activation is separate:** merchant authorization, merchant account control, live key security, endpoint configuration, incident monitoring, refund handling and production acceptance tests are mandatory before using real funds.

The Google Gemini preview branch key does **not** automatically make Paystack available. Never enable Paystack live mode merely to demonstrate a working webhook.
