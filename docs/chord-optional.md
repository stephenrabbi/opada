# Chord integration: OPTIONAL for Opada

Based on https://api.chordhq.xyz/docs/quickstart/.

Chord is a conversational AI teammate provider, **not Paystack's payment verification API**.
Opada's critical path remains: authenticated staff entry → reviewed Neon record → deterministic rules → owner dashboard.

## Credentials and permissions
Ask Chord account/workspace owner to create a dedicated **development workspace** and teammate, with least-privilege scopes: `teammate:read`, `orchestrator:chat`, optional `thread:read` if history is needed. Chord uses `Authorization: Bearer <CHORD_API_KEY>`, workspace ID and teammate ID.

Do NOT commit keys. When available, use server-side Vercel secrets `CHORD_API_KEY`, `CHORD_WORKSPACE_ID`, `CHORD_TEAMMATE_ID`, only for development preview. A local adapter in `src/chord-client.js` supports isolated tests. It is not currently connected to any API route or user interface.

## Intended use
- Explain an already-verified discrepancy or follow-up workflow to an owner; do not supply unreviewed AI figures.
- Never allow Chord to independently approve payments, issue refunds, change stock or modify financial records.
- Obtain the owner's authorization before transferring any actual business data to Chord; begin with synthetic/non-sensitive summaries.
- Use stable `sender_id` and a distinct `session_id` per conversation. `agent_invoked:false` is a normal gated/no-reply outcome.
- Chord HTTP status and its own webhook features are unrelated to Paystack's signed webhook verification.

## Shipping gate
No Chord production rollout until scopes, pricing, privacy terms, message limits, data transfer and error handling are reviewed. Chord is **not required** to ship the core restaurant sales workflow.
