# Proposed limited Opada production release — approval required

**Status: proposed, NOT approved, NOT deployed.**

## Candidate
- Integration commit: `fea33d746c3e149ceca96b45d823014b88c838fb`
- Preview (READY): https://opada-o0yua0gop-oluwafemiherbert-9387.vercel.app/demo
- Production alias (unchanged): https://opada.vercel.app
- CI at candidate: two application verification runs and two UI screenshot/browser runs succeeded.

## Allowed presentation scope
- Public landing page and navigation.
- `/demo` synthetic, browser-local funder walkthrough.
- UI changes that require no production database migration, payment credential, identity-provider activation, or real customer data.

## NOT approved for activation
- Staff/owner session login, invitation redemption, or newly exposed real-data APIs.
- Neon production migrations (0006–0008), writes to production data, or Paystack/Gemini live transactions.
- Promotion of a preview URL as if it were an identical production deployment.

## Approval and deployment gates
1. @Okun15Ola confirms the deployment branch, reviews the candidate diff and shares timed-loop findings.
2. Review exact Vercel production environment and route exposure; confirm the intended deployment preserves existing owner/staff behavior and fail-closed auth flags.
3. Select a reviewed limited-scope production commit, potentially cherry-picking only presentation changes; **do not merge the entire integration PR solely because CI is green**.
4. Obtain explicit approval for the selected commit and release window, plus a rollback target.
5. Deploy exact approved commit to production; verify READY, alias, desktop/mobile navigation and demo interactions. No real accounts in walkthrough.
6. Restore prior known-good production deployment if smoke tests fail.

**Current decision: HOLD.** No commit is approved for production deployment yet.
