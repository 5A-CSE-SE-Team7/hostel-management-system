# Dependency integration status

The administrator explicitly authorized repairs to existing teammate PRs on 2026-10-30. The former proposals are now actual, separately authored Aayaan commits on the existing PR42 and PR51 branches; PR authors/ownership/base/review states are unchanged.

- PR42 commit 27413dd8ba29743ee96c2c2d977a107dd5babf16 restores STAFF=[warden,admin], strictly audited student-detail reads and protected bounded/parameterized audit list/verify route integration using the existing genuine helper. The hash-chain implementation was not changed. Four regression tests preserve 401/403 and test real SQL tampering. Standalone M1 suite: 20 PASS.
- PR51 commit 918fc0e7ec83f5ec7335a43df585a89851656270 adds fee-route calendar checks before MySQL writes and 12 real fee regression cases. No other lead functionality, including the new notify utility, was overwritten.
- No new M2/audit PR exists. The existing M2 branch supplies genuine inventory/allocation/audit code in the isolated candidate. This restores existing integration contracts; it does not claim completion of Abhishek's full audit issue, UI, review or submission.
- The complaint stack was normally updated in order #43→#44→#45→#46. The pinned frontend candidate retains real M1 account pages, complaint lifecycle/notifications and the fee frontend.

Default actual combined validation now passes 70 backend and 45 frontend tests, build and both full audits. It applies no temporary STAFF/calendar patch. Historical proposal flags/scripts are retained only for older snapshots and are not used for this result; the actual-contract check remains mandatory and nonzero on a missing contract.

Repository-owner Project configuration, private protection verification, main integration and operational deployment/observation acceptance remain external dependencies. Full issue15 ownership and acceptance remain with its assignee.

## Historical proposal record (superseded by the commits above)

# Proposed owner fixes — not applied to teammate branches

Actual PR #42 head 14cc4cc7d8a5a830e637338806d6c96bc34c5473 exports requireAuth/requireRole but no STAFF. Genuine M2 inventory/allocations and M4 fees/visitors/leave/reports use `const { requireRole, STAFF } = require('../middleware/auth')` and spread STAFF while importing. Combined startup throws before serving requests.

Smallest proposed M1 change in backend/src/middleware/auth.js:

```diff
-module.exports = { requireAuth, requireRole };
+const STAFF = ['warden', 'admin'];
+module.exports = { requireAuth, requireRole, STAFF };
```

This preserves the existing genuine role-check implementation and the original contract on M1's older feature branch. It is a proposal for Aditya/repository owner, not a pushed teammate change. Alternatively each owning router may explicitly select warden/admin, but that changes more teammate files. Do not introduce a fake auth implementation.

The combined validator defaults to BLOCKED/nonzero when this export is missing. `--with-proposed-staff-export` appends only this export in the temporary snapshot to test the proposed integration. A passing proposed candidate does not establish that current PRs integrate without owner action.

PR #42 also contains an audit implementation that overlaps Abhishek's M2 utility. Owners must select/reconcile that file; the validator uses the genuine M2 hash-chain implementation and real #42 auth/admin/profile, never a stub.

Shared frontend resolution: retain #40 shell/api/auth, its named API adapters and extension points; retain the actual #40 entry which discovers #42 Login/Register and passes them into App props. Retain #46 complaints/notifications/dashboard and #48 Fees components. This resolution occurs explicitly in the temporary validator; #39/#42 branches are unchanged. Existing #39 approval/required owner review must be respected.

The first full backend run with only the STAFF proposal applied executes 53 tests; 51 pass and two genuine M4 security tests fail:

1. TC-Sec-04 expects a `STUDENT_RECORD_VIEW` event after GET /api/students/:id. Current PR #42 profile.js returns the record without auditing it. Proposed M1 change: import `audit` from the selected genuine M2 utility and, after authorization/student lookup but before returning the record, call `await audit(req, 'STUDENT_RECORD_VIEW', 'user', id, null, { strict: true })`. The existing test verifies the warden role in the event. Do not remove that assertion.
2. TC-Sec-05 calls GET /api/admin/audit and GET /api/admin/audit/verify. Current PR #42 admin.js has no audit routes, so `/audit` returns a JSON error object and `logs.map` fails. Proposed M1/M2 integration: add adminOnly-protected audit list/verify routes. Import genuine `verifyChain`; return its result from `/audit/verify`. List SQL should select id, user_id AS userId, role, action, entity, entity_id AS entityId, details, ip, created_at AS createdAt from audit_logs; accept validated optional action and a bounded integer limit 1..500; use parameters for WHERE action=? and LIMIT ?, ordered newest first. This preserves the existing M4 tests and actual tamper-detection behavior. No substitute verification implementation is proposed.

These endpoints are teammate-owned. Neither proposal is applied to their branch or to the temporary candidate. The combined runner preserves the two failing tests and its nonzero exit. Frontend and build checks still execute so independent results remain visible.


## Newly verified fee-owner issue #21 blocker

The real M4 fees.js routes use the shared date validator, which accepts `2026-02-30` and non-leap `2026-02-29` because JavaScript Date.parse normalizes them. MySQL correctly rejects those calendars, causing HTTP 500 INTERNAL_ERROR for assessment/payment writes instead of HTTP 400 field validation. Current dedicated fee regressions: 9/12 PASS, 3 FAIL for those date cases. Other validation, decimal SQL persistence, search and role isolation pass with the explicit temporary STAFF proposal.

The separate integration branch stores `docs/proposals/issue-21-calendar-validation.patch` as a review-only route-scoped proposal. It is not applied to teammate sources. `bash scripts/ci/verify-fee-proposal.sh` composes actual sources in /tmp, explicitly applies the STAFF export proposal and that calendar patch, then runs the real fee suite: 12/12 PASS on Node22. It does not change the actual combined CI result or address the two separate audit failures. The lead owns acceptance and application of this fee fix. Auth/audit issues remain unchanged.

The frontend candidate now retains all five genuine M1 pages and role navigation. The original PR42 App references Link without importing it; the integrated shared shell avoids that obsolete SignedInHome entirely. If M1's owner retains their independent App, import Link from react-router-dom there. No proposed patch for that teammate App is applied here.
