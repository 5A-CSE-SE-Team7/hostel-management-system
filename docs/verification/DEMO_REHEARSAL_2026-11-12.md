# Local demonstration rehearsal fixes — 2026-11-12

Base: main `4ea9ea3107ca5c3626b1db8ea7d1a6aebc6a52b8`. Refs #8 (profile), #12 (allocation), #13/#14 (transfer/stay regression coverage), #9 (authorization).

## Confirmed causes and fixes

- Allocations.jsx exposed a numeric Student ID field without an eligible-student lookup. It now uses a labeled search input plus native student selector, showing name, SRN and email. The request still sends the selected numeric user ID to the unchanged allocation API. Available-bed selection is preserved.
- The existing student directory is not an eligibility list. `/api/students?eligibleForAllocation=true&search=...` now limits results to current student roles, active accounts and no unreleased allocation. General management search retains inactive/currently allocated students, but excludes accounts whose role has changed to staff. Search by name/SRN/email remains available. Parameter validation, staff-only authorization and fail-closed read auditing are retained; no schema change is needed.
- Profile.jsx rendered SRN unconditionally and sent the whole joined profile back. Staff had `contact:null`; the backend rejected a legitimate name save with HTTP400 / `Contact number cannot be empty`. The baseline reproduction JSON shows this for admin, warden and maintenance. Staff now see name/email/role without student fields, submit name only, and the backend validates only staff-editable fields even for legacy full-profile requests. Students retain read-only SRN/email/role and the same editable student fields. Protected API updates remain ignored as required by #8; neither self-service nor staff student management can change student identity.
- Additional confirmed allocation defects: two synchronous submissions sent two POSTs, and field validation details were discarded in favor of generic `Validation failed`. The initial failing regression captures both. A synchronous pending guard prevents duplicate submissions; field details remain visible. Rejection refreshes eligibility/availability while preserving the original error. Successful allocation refreshes current rows, history, available beds and occupancy.
- Search requests are debounced and canceled/ignored when superseded. Changing a query clears the selection; lookup failures disable selection and offer retry. The first 100 matches are bounded by the existing API limit; refine the search to locate later matches. Enter in the search field does not accidentally submit an allocation.

Eligibility is a query-time snapshot. Another staff member can allocate/deactivate a selected student before submission; the existing backend validation/row locks/unique constraints remain authoritative and the UI handles the rejection. No client-only security guarantee is claimed.

## Actual verification

| Verification | Actual result |
|---|---|
| Complete backend suite | 119 passed, 0 failed |
| Complete frontend component suite | 78 passed, 0 failed |
| Frontend production build | PASS |
| Real frontend/HTTP/MySQL integration | 4 passed, 0 failed |
| Complete local Chromium suite | 16 passed, 0 failed |
| Local workflow contracts | 15 passed, 0 failed |
| Backend and frontend dependency audits | Both zero vulnerabilities |

New regressions cover both Admin and Warden, numeric allocation payloads, inactive/missing/already-allocated candidates, name/SRN/email search, role-changed accounts, concurrent-submit guarding, stale/failed searches, check-in/transfer/check-out/history and a valid audit chain. All four personal profile pages save/reload permitted data and retain identity protection. Existing genuine registration/complaint/assignment/resolution/RBAC/browser checks remain active.

The populated M4 browser rehearsal creates real inventory, visitor/outpass requests and approvals, assessment/payment rows with verified balances, read/unread notifications, report CSV downloads and an audit integrity check. No additional application failure was found in those flows.

Initial browser result: 14 passed, two new fixture assertions failed because registration correctly normalizes SRNs to uppercase and emails to lowercase. The fixtures were corrected without relaxing assertions; the complete rerun passed all16. Both logs are retained. This was a fixture error, not an additional application bug.

## Isolation and reproducibility

All database writes used a newly created MySQL container `hms-rehearsal-mysql-20261112`, host port13316, with no existing volumes mounted. Backend resets were confined to its `hms_test`; browser fixtures used `hms_e2e`; live UI integration used `hms_ui_test` and API port14001. The team's existing populated database/container on port3306 was never used. No demo database reset or reseeding is required to install these fixes.

Baseline profile handlers in the original checkout were checked as identical to main's affected files, then exercised against only this isolated synthetic test instance. The baseline reproduction used the original handlers; candidate full-suite results used the fix worktree.

Commands used (with the isolated DB host/user/password and DB_PORT=13316 supplied in each command's environment):

- `NODE_ENV=test DB_NAME=hms_test npm test --prefix backend`
- `npm test --prefix frontend` and `npm run build --prefix frontend`
- `HMS_API_BASE=http://127.0.0.1:14001 npm run test:integration --prefix frontend`
- `NODE_ENV=test DB_NAME=hms_e2e NODE_OPTIONS=--dns-result-order=ipv4first HMS_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e --prefix frontend -- --project=chrome`
- `node --test tests/ci/*.test.mjs` and both `npm audit --audit-level=high` commands.

Only synthetic data was used. These are Linux/Chromium results; Windows execution is not claimed. Final PR CI supplies branded Chrome/Firefox verification. Automated accessibility checks do not certify human screen-reader acceptance.

Raw terminal logs (gzip), baseline JSON, metadata and checksums: `docs/evidence/demo-rehearsal-20261112/`. Gzip preserves the original output, including failed runs. SHA256SUMS covers all archived files.

## Team lead quick check

After owner review/merge, update the checkout and restart backend/frontend using the existing demonstration database configuration. No database migration, seed rerun or scalability change is part of this fix.

1. Admin/Warden: Allocations → Search students (name, SRN or email) → Student → Available bed → Allocate bed. Inactive/already allocated candidates are absent. Check in, transfer and check out normally; inspect retained history.
2. Each role: My profile → edit Full name → Save profile → reload. Staff see no SRN/contact/year fields. Students see read-only SRN/email/role and their permitted editable details.
3. Confirm the existing complaint, notification, fees, visitors, leave, reports and audit demonstration flows against the prepared synthetic records.

Review the PR's actual CI status before merging. No automatic merge, issue closure or changes to unrelated deliverables are performed by this work.
