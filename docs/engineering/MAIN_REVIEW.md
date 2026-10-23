# Review of Herbert's new work (22 Oct 2026, read-only, 45-minute time box)

**Scope:** `git fetch --all` on 22 Oct ~18:30 WAT, then compared `origin/main`, `origin/feature/paystack-free-checkout` (PR #5's branch) and our stack #7–#13. No merge, no rebase, nothing pushed to anyone else's branch.

## 1. Summary
1. **`main` has not changed** (`911dfdb`, same as on 21 Oct). Herbert's auth work is **not on main**. He pushed **30 commits (1,114 lines)** straight onto **`feature/paystack-free-checkout`** (`1eb5784 → 059536d`, 22 Oct 14:01–15:10 WAT), plus a side branch, `feat/verified-identity-session-bridge` (`82a5cac`).
2. The auth work is **well built and fully switched off**: OIDC identity-token verification, database-backed sessions in `__Host-` cookies, and staff invitations. Every route returns 404 unless several env flags are set; no identity provider has been chosen.
3. **Nothing of his breaks because of our schema changes on his database** (details in [the incident record](incidents/2026-10-22-migrations-on-herbert-db.md)).
4. **The live site (`opada.vercel.app`) does not run any pushed code.** Its `/api/health` response exists in no commit on any branch, and `/api/team` (pushed, not feature-flagged) returns 404 there. The extra tables and columns on his database (`webhook_events`, `menu_items.recipe`, `entries.confidence`, `staff_api_tokens.label`) are also in no branch. Most likely both come from **unpushed local code**.
5. **PR #5's branch is very unlikely to be Vercel's production branch:** Vercel lists PR #5's deployment as *Preview*, and production didn't change after his 15:10 push. Still, only Herbert can confirm, so ADR-012's merge hold stays.

## 2. What's new

### 2a. Auth, in detail (all disabled by default)
| Part | How it works | Files |
|---|---|---|
| **Login method** | No passwords in Opada. The browser gets an **OIDC ID token from an external identity provider** and POSTs it to `/api/session/login`. The server verifies it with `jose`: **RS256**, issuer, audience and JWKS URL from server env (all `https`, JWKS on the issuer's origin), 30 s clock tolerance, `exp`/`iat` checks, and **`email_verified === true` required**. No provider is chosen yet (Google, Clerk, Auth0 etc. would all fit). | `src/verify-identity-token.js`, `src/identity-claims.js`, `app/api/session/login/route.js` |
| **Identity → restaurant** | The token's `sub` must match **exactly one active** `staff.auth_subject` (fails closed on duplicates; new partial unique index `staff_auth_subject_unique`). The business comes from that staff row, never from the client. | `src/resolve-verified-staff.js`, `db/migrations/20261022_unique_identity_subject.sql` |
| **Roles** | Same three as today: `owner`, `manager`, `staff`. Invitations can create only `manager` or `staff`. `/api/team` (staff list) needs owner or manager. | `src/team-access.js`, `src/staff-invitation.js` |
| **Sessions** | 32-byte random secret → cookie **`__Host-opada_session`** (`HttpOnly; Secure; SameSite=Lax; Path=/`), **8 h** max. Only the **SHA-256 digest** is stored in `staff_sessions` (FK `(staff_id, business_id)` → `staff`, so a session can't cross tenants). Checked on every read: not revoked, not expired, staff still active. Logout revokes server-side. State-changing routes require a same-origin `Origin` header over https. | `src/session-policy.js`, `src/session-store.js`, `src/session-request.js`, `src/session-origin.js`, `app/api/session/{route,me,logout}` |
| **Tokens (today)** | The **existing bearer tokens** (`staff_api_tokens`, SHA-256 hashed) are **still the only working auth path**. `authorizeStaff` is unchanged, and our stack uses it too. | `src/staff-auth.js` |
| **Invitations** | Owner creates a hashed, 48 h single-use invite for an email + role; redemption is an atomic conditional `UPDATE` that needs the verified identity's subject/email. **Library functions only, no HTTP routes.** QA'd on an isolated Neon branch (`br-steep-resonance-zaz6fqg3`). | `src/prepare-staff-invitation.js`, `src/redeem-staff-invitation.js`, `db/migrations/20261022_staff_invitations.sql` |
| **Feature flags** | Login needs `OPADA_SESSION_LOGIN_ENABLED`, `OPADA_SESSION_READ_ENABLED`, `OPADA_IDENTITY_ISSUER`, `OPADA_IDENTITY_AUDIENCE` and `OPADA_IDENTITY_JWKS_URL`; otherwise 404. | `src/login-policy.js` |
| **Side branch** | `feat/verified-identity-session-bridge` was cut at 14:17, **before** the login route (14:42) existed. It adds an alternative, `src/issue-verified-session.js` (a signed membership bridge with fail-closed tests), and was never merged back. Herbert needs to say whether it is superseded or still planned. | — |

Assessment: careful and security-minded (hash-only storage, fail-closed lookups, tenant FKs, `__Host-` cookie, origin checks), with good unit tests. Missing before it can go live: the provider choice, rate limiting on login, and, as with ours, **RLS**; isolation is still application-level.

### 2b. Other changes
- `/api/ingest` rewritten to use `authorizeStaff` (cleaner) but **without** our server total check or idempotency key.
- Owner page: new **Team** view (calls `/api/team`).
- Landing page copy: hospitality businesses.
- `package.json`: adds `jose ^6.1.0`; no lockfile update (his branch has no lockfile).
- Handover: a free-plan deployment policy (Vercel Hobby blocks deploying partner-authored commits through his account; *don't* work around it), the invitation QA log, and access notes (Okunola has Neon **Editor** on his project).

## 3. Does this explain the live site and the extra schema?
| On his database / live site | Explained by pushed code? |
|---|---|
| `staff.auth_subject` | **Yes**: the auth work above |
| `webhook_events` (id, provider, event_id, business_id, received_at) | **No**: not in any commit on any branch |
| `menu_items.recipe`, `menu_items.unit`, `menu_items.updated_at` | **No** |
| `entries.confidence` | **No** |
| `staff_api_tokens.label`, `action_audit.details` | **No** |
| Live `/api/health` → `{"status":"restricted","authenticatedStaffRequired":true}` | **No**: that response is in no commit |
| Live `/api/team`, `/api/session/me`, `/api/ingest/message` → 404 | Consistent with production running neither his pushed branch nor ours |

**Conclusion:** there is unpushed code (an event log for webhooks, recipes, extraction confidence, token labels) that both produced those columns and is serving `opada.vercel.app`. **Ask Herbert to push it to a branch** so we can compare it (ADR-013: "take the better parts").

## 4. Conflicts with our stack
- **`flags.status`:** his code only ever writes `'checked'` (`/api/flags/check`, same code as ours) and never reads `'resolved'`. Compatible with our `open/checked/resolved` constraint. His owner page would show `resolved` flags with a neutral style; cosmetic only.
- **Git conflicts** (`git merge-tree`, our #13 head vs his `059536d`): exactly **3 files**:
  - `app/api/ingest/route.js`: keep **his structure** (`authorizeStaff`, `noStore`) and add **our** total check, idempotency key and post-insert checks.
  - `app/owner/page.jsx`: keep both his **Team** view and our live alerts/FlagsPanel. They touch neighbouring parts of the same minified line, so this is a manual merge.
  - `package.json`: union of dependencies (`jose` + our dev deps and scripts), then **regenerate `package-lock.json`**.
- **Migrations:** two schemes in one folder. His `20261022_*.sql` (date-named, applied by hand) vs our `NNNN_*.sql` (runner with checksums). **Our runner skips his files** (pattern `^\d{4}_`), so they'd silently never run. His invitations file also has its own `BEGIN/COMMIT`, which nests badly inside our per-file transaction. And `staff_sessions` depends on the `staff(id, business_id)` unique index created in the invitations file, so order matters.
- **Schema drift:** our `0001_baseline` is a reconstruction. His real database has 6 extra columns and 1 extra table. Until we have his `pg_dump --schema-only`, the two schemas can't be reconciled precisely.

## 5. Merge plan (after Demo Day; needs Okunola's go-ahead and Herbert's input)
1. **Herbert:** push the unpushed live-site code to a branch, say which auth branch is current, confirm Vercel's production branch, and share `pg_dump --schema-only` of his database (no data).
2. **Decide the production branch** (likely `main`) and protect it: PRs only, CI required.
3. **Schema first:** turn his dump into `0000_herbert_baseline`. Rename his three migrations to `0006_staff_invitations`, `0007_staff_sessions`, `0008_unique_identity_subject` (in that order, dropping the inner `BEGIN/COMMIT`). Add `0009_reconcile` for any differences from our 0001–0005. Add the `db:migrate` empty/known-database guard from the incident follow-up.
4. **Rebase our stack (#7–#13) onto his `059536d`** on a new integration branch (never force-push his). Resolve the 3 conflicts as described above, then run the full suite, build and the browser journey.
5. **Bring in the unpushed features** we want (likely `webhook_events` as the webhook replay log, which M2 needs anyway; `recipe` as the start of M1 recipes; `confidence` alongside our `review_reasons`).
6. Merge the integration branch into PR #5's branch, then PR #5 into the production branch, once the release gate passes. The rollback script for his database is only needed if we decide **not** to adopt our schema there.

The **demo stays on our stack** (staging and the local fallback), unaffected by any of this.
