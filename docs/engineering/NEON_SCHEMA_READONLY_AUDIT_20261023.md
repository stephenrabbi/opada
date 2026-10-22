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
