# Opada Paystack test-mode integration
Webhook: `/api/paystack/webhook`. **Do not point live Paystack traffic here.**
1. Create a Paystack test-mode secret key. Set `PAYSTACK_TEST_SECRET_KEY` in Vercel server-side environment variables only.
2. Register the webhook URL in Paystack **test mode**, preferably on a protected preview / staging environment.
3. Before testing a charge, map its reference to a *synthetic* business and expected amount in `paystack_expected_references`. A separate authenticated transaction-creation flow must perform this mapping before general use.
4. Handler verifies raw-body HMAC-SHA512, Paystack test domain, independently calls Paystack transaction verify, checks reference and expected amount, then inserts idempotently into `payments`.
5. Reconcile only payments processed by Paystack against **Paystack-covered** staff transfers. Do not compare against arbitrary bank transfers.
The handler is not enabled without the test key and database connection; no real charges or alerts are performed.
