# Presentation-only deployment package — candidate inventory

**Review-only document. No production authorization.**

## Current verified source
- Source integration commit `dcb84c531e026ed2016671f7d202abfd9436f4d2`.
- Application checks: both passing.
- UI checks: one passing and another in progress at the time of inventory.
- Production `main` lacks both `app/demo/page.jsx` and `app/opada-ui.css`, so publishing the demo requires a self-contained page/style dependency review.

## Proposed presentation scope and dependencies to review
1. `app/demo/page.jsx`: browser-local synthetic tour, with owner/staff example tabs and clear limitations.
2. `app/page.jsx`: public landing page, navigation to demo, and links to existing portals.
3. `app/opada-ui.css`: presentation styling. **Do not blindly copy into `main`**; review global selectors and imports for possible effects on existing production screens.
4. CSS import in `app/layout.jsx` and any component dependencies referenced by the changed pages: inspect before selecting files.
5. Acceptance tests for demo navigation/mobile layouts, isolation/no-network and visible synthetic notices.

## Excluded
- `app/api/**`, `src/**` authentication and payments changes, migrations `0006`–`0008`, environment flags, live financial endpoints and Neon production writes.
- A merge of the entire integration branch, since its broad operational changes are not approved for production.

## Release process
1. Co-developer and owner review the presentation-only file inventory and exact diff.
2. Create a separate limited-release branch from `main`, copy only approved page/style dependencies, and complete CI plus preview checks.
3. Confirm expected production branch, backup/rollback target and deployment window.
4. Only after explicit approval merge/deploy the exact reviewed commit; smoke-test `/`, `/demo`, mobile, and existing staff/owner routes.

**HOLD**: no production branch edits, no live deployment and no database migrations.
