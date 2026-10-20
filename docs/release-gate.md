# Opada — client release gate

**Team Stack-Mind** (Herbert Stephen and Okunola Olamide).

Do not call this release client-ready until every gate below is independently verified.

- [ ] GitHub CI: all unit tests and Next.js build green on the candidate commit.
- [ ] One authenticated staff member can record a synthetic transaction through the actual UI.
- [ ] An unauthenticated request returns 401; staff from Business A cannot read/write Business B.
- [ ] Gemini text extraction produces reviewable JSON for English, Nigerian Pidgin and Yoruba and never invents missing money.
- [ ] Approved structured entry is stored in Neon exactly once.
- [ ] Rules execute from stored evidence; missing stock/payments do not generate false alerts.
- [ ] Paystack signed webhook is independently verified in **test mode** and duplicate deliveries do not double-count.
- [ ] Owner sees flags with evidence and can mark them checked; audit record is created.
- [ ] Mobile layout tested on actual Android device.
- [ ] Timed end-to-end test under 60 seconds, including cold starts.
- [ ] All credentials stored as Vercel secrets, with no real customer information in test logs.
- [ ] Client acceptance, support owner, backup and rollback procedures documented.

## Operational priority
1. Authenticate and persist; 2. evidence-backed flags and owner action; 3. verified Paystack test payment; 4. multilingual Gemini; 5. voice after core flow passes.

No real financial or customer data until authorization, privacy, retention, and rollback are tested.
