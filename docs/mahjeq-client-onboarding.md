# Mahjeq Foods and resturant — Opada client onboarding

Client-provided restaurant name (provisional spelling): **Mahjeq Foods and resturant**.
Product: **Opada**. Team: **Stack-Mind**.
Launch scope: exactly one restaurant, with an owner and individually authorized staff accounts.

## Separation and release controls
- Do not reuse either **OPADA SYNTHETIC TEST RESTAURANT** business or its credentials for this client.
- Do not copy synthetic sales, payments or flags to client records.
- Provision an isolated restaurant identity after confirming the official display name and authorized owner.
- Provision unique staff accounts; do not share owner credentials.
- Verify authentication, owner-only access and cross-business isolation before accepting real financial data.
- Require review before storing AI-extracted financial figures.
- Leave Paystack live-mode receipt reconciliation and automated alerts disabled until verified against the restaurant's actual payment flow.
- Validate backup/restore, error handling, audit trail, timezone Africa/Lagos and mobile acceptance.
- Require an explicit production go-live approval after the release gates pass.

## Pending owner-provided details
- Confirm exact restaurant display name and spelling.
- Name/contact of the owner authorized to administer accounts (share privately when provisioning, not in GitHub).
- Number of staff needing individual accounts.
- Whether the restaurant processes Paystack payments, ordinary bank transfers or both.
- Opening inventory and verified menu costs needed for evidence-based checks.

Do not commit personal contact details, access tokens, Paystack secrets or customer transactions to this repository.
