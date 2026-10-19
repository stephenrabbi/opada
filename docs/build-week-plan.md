# Opada Build Week — Shared implementation plan

**Team:** Herbert Stephen and Okunola Olamide  
**Golden flow:** Ingest → Process → Action  
**Demonstration target:** Under 60 seconds with **synthetic** Nigerian restaurant data.

## Herbert — Ingest and Process
- Validate staff identity and derive business scope from the authenticated session. Never accept client-supplied business IDs as authorization.
- Convert English, Pidgin and Yoruba staff messages into validated structured records. Gemini is an *extractor*, not the authority for arithmetic.
- Preserve raw message, timestamp, staff identity, itemized sales, cash/transfer split, source, and review status.
- Run the deterministic stock-sales, verified-payment reconciliation, and ingredient-margin checks.
- Save evidence IDs and explain when a rule is skipped because data is unavailable.

## Okunola — Action, Paystack, demo presentation
- Implement Paystack **test-mode** webhook ingestion with signature validation, deduplication and trusted business mapping.
- Compare only payment channels demonstrably covered by Paystack. Do not assume all bank transfers pass through Paystack.
- Implement owner-visible flags: evidence, amount/direction, suggested action and **Mark as checked** with an audit record.
- Prepare a guided, repeatable 60-second demo, with clear synthetic/test-mode labels.

## Joint milestones
1. **CI & deployment:** Run Node 22 tests and Next.js build on pull requests. Vercel project must be linked to GitHub under Herbert's team.
2. **Secure synthetic ingestion:** Authenticate two staff identities and verify cross-business access is denied.
3. **Process:** Persist synthetic transactions and produce flags only with sufficient evidence. Avoid duplicate flags on retries.
4. **Action:** Verify Paystack HMAC and replay defense, render flags and audit owner acknowledgements.
5. **End-to-end demo:** Record timings across text → stored transaction → flag → owner review; pass the complete flow within 60 seconds.
6. **Voice/multilingual:** Test Pidgin/Yoruba/English extraction including partial, ambiguous and multi-item messages; route low-confidence extraction to review.

## Safeguards
- Do not use actual restaurant money, personal information or real Paystack charges in tests.
- Keep `DATABASE_URL`, Paystack secrets, Gemini keys and staff tokens in server-side secrets only.
- No production deployment from unreviewed source.
- Do not claim real-time notifications or financial accuracy before end-to-end validation.
- Add Okunola as a GitHub collaborator (not an owner) when his account is available.
