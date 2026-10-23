# Neon schema comparison — read-only audit (23 October 2026)

Project: `opada` (PostgreSQL 17). Branch names and identifiers were checked through the connected Neon account.

## Main database branch

- Branch: `main` (`br-flat-waterfall-zaxybpsl`).
- The `schema_migrations` ledger exists and lists exactly: `0001_baseline`, `0002_entries_idempotency_key`, `0003_gemini_usage`, `0004_rules_flags`, `0005_messages`.
- Existing tables include `businesses`, `staff`, `entries`, `payments`, `flags`, `messages`, `gemini_usage`, `menu_items`, `schema_migrations`, `staff_api_tokens`, `webhook_events`, `paystack_expected_references`, `action_audit`.
- `staff.auth_subject` already exists even though migration `0006_identity_sessions` is **not** recorded. Do not infer the associated unique index or composite tenant foreign keys are present.
- Missing release tables: `staff_sessions`, `staff_invitations`, `login_attempt_buckets`.
- Migrations `0006` to `0008` are candidates **only after** checking ledger checksums, existing indexes/constraints, and a staging trial on a fresh child branch.

## Existing QA branch

- Branch: `opada-invitation-migration-qa` (`br-steep-resonance-zaz6fqg3`), forked on 22 October.
- Has `staff_sessions` and `staff_invitations`, but **no** `schema_migrations` ledger.
- Lacks `messages`, `gemini_usage` and the newer `entries` columns `idempotency_key`, `message_id`, `line_no`, `extraction`; also lacks newer flag details and timestamp fields.
- Therefore **do not use this QA branch as a complete release-stage replica** or run the numbered migration runner against it without reconciliation.

## Release decision

1. Preserve `main` and its business data unchanged.
2. Create a fresh staging branch from current Neon `main` (separate from the older QA branch) when authorized.
3. Check all five ledger checksums against the exact reviewed GitHub commit. Verify `staff.auth_subject` index and tenant foreign-key status.
4. Apply only missing, reviewed migrations to **staging** and exercise auth, ingestion, flags, payments, and team workflows.
5. Only after passing staging, decide on backups, release timing and production migrations with owner approval.
6. The `/demo` funder simulation itself requires **no Neon migrations or real API credentials**, and should be prioritized for public deployment separately.

This audit only used read-only metadata and information_schema queries; it did not change any Neon records or schema.

## Fresh staging branch created (23 October 2026)

- Branch: `opada-release-staging-20261023` (`br-silent-thunder-za79z7l8`), parent current `main`, created with Neon defaults after a custom suspend interval was rejected by this account.
- Read-only verification confirms all five migration ledger entries `0001`–`0005` were copied into staging.
- `staff.auth_subject` already exists and `UNIQUE (business_id,auth_subject)` is already enforced. The pending `0006` migration also adds a *separate* partial uniqueness index on `auth_subject`, which is stricter across all businesses. Review existing (non-sensitive, aggregate) duplicates and identity semantics before applying it.
- The staff table currently has a primary key on `id`; `0006` proposes a composite unique index on `(id,business_id)` to support tenant-scoped foreign keys.
- **No migrations have yet been applied to staging.** Validate migration checksums against source first and test DDL only on this isolated branch; do not point production Vercel secrets to it or merge the branch.

## Tenant identity migration correction

The `0006_identity_sessions.sql` release migration now explicitly adds a *tenant-scoped* unique index on `(business_id,auth_subject)`, instead of global identity uniqueness. This is required because the reconstructed `0001_baseline` does not declare the existing production constraint. The new test asserts both allowed cross-business membership and rejected within-business duplicates.

Do not apply these migrations to the real main branch. First confirm the corrected commit's full test suite passes, compare existing migration ledger checksums, and validate on isolated staging.

## Isolated staging migrations applied — 23 October 2026

After CI success on the corrected identity uniqueness implementation, migration files `0006_identity_sessions`, `0007_login_attempt_buckets`, and `0008_staff_invitations` were applied as per-migration SQL transactions **only to branch `br-silent-thunder-za79z7l8`**. Migration checksums were computed directly from the GitHub SQL contents after fetching the current integration branch.

Post-application read-only verification:
- `schema_migrations` now lists `0001` through `0008`;
- `staff_sessions`, `staff_invitations`, and `login_attempt_buckets` all exist;
- `staff_session_tenant_fk`, `staff_inviter_tenant_fk`, and `staff_acceptor_tenant_fk` are all composite foreign keys using `(staff_id,business_id)` or `(invited_by/accepted_by,business_id)`.

The original QA branch and production `main` remain unchanged. **The staging migration completed, but full end-to-end application tests against this Neon branch and checksum comparison with the Node migration runner remain pending.** Never turn on public login or migrate main based only on these schema-level checks.

## Post-migration staging smoke audit — 23 October 2026

The application and responsive UI GitHub workflows for commit `fbc33b8` both completed successfully.

Read-only Neon staging queries verified:
- The migration ledger includes versions `0001` through `0008`.
- Migration checksum for `0008_staff_invitations` is `fe96600727866d9295675b7746d4419cce61b70104b231c2ba586e09da2e033a`; this is the **stored ledger value**, not an independently recalculated file hash.
- Staging has 2 businesses, 2 staff records, zero session rows, zero invitation rows, zero login-attempt rows, and zero duplicate identity subjects **within any business**.
- Tenant-scoped invitation/session foreign keys and uniqueness indexes were inspected after applying migrations.

**Remaining release gates:** independently recalculate the `0008` migration checksum against the exact source bytes, run integration tests through the application against this Neon staging connection with *synthetic identities only*, confirm no external payment operations, obtain co-developer approval, and complete protected production rollout.

Do not interpret the schema inspection alone as live login, token revocation, invite acceptance, or cross-tenant rejection having been exercised on Neon staging. Production remains unchanged.

## Rollback-only live staging constraint test — 23 October 2026

A single PostgreSQL anonymous block on Neon staging `br-silent-thunder-za79z7l8` exercised synthetic same-tenant and cross-tenant staff sessions and invitation inserts. It asserted cross-tenant foreign-key rejection, legitimate session insertion, session revocation, cross-tenant invitation rejection, and same-tenant invitation insertion. The anonymous block used an inner exception/subtransaction to deliberately roll back **all** synthetic inserts on successful completion. The resulting SQL command returned successfully.

Read-only counts immediately before and after remained identical: businesses **4 → 4**, staff **3 → 3**, sessions **1 → 1**, invitations **0 → 0**; zero businesses with the fresh `OPADA SYNTHETIC ROLLBACK` prefix remained. The older synthetic QA businesses and previously revoked session were preserved.

The prior standalone staging script is committed and its code checks passed, but it was **not** the execution mechanism for this database-side anonymous-block test. Application HTTP flows, invitation redemption, external identity authentication, and live payment integration are not covered and remain release gates. Production remained untouched.
