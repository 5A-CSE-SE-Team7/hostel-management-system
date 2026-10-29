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
