# Sprint 1 requirements traceability and completion evidence

Baseline: `03dacfec91f798ba9df142ab380a9f9941a7e5d9` (main, before Sprint 2).
This completion branch preserves the submitted SRS/SAD/STP. PASS means the listed
local test actually executed, not approval, deployment, or issue closure.

| Requirement | Issue | Implementation evidence | Test case / actual result | Completion / limitations |
|---|---|---|---|---|
| HMS-S01 | #1 | README.md, docs/PR_HANDOFF.md, .github/CODEOWNERS | Repository/workflow inspection | Existing closed issue; Project delivery still blocked under #4 |
| HMS-S02 | #2 | backend/src/{app,db}.js, backend/db/schema.sql, middleware/common.js | sprint1.test.js operations PASS; audit fresh DB 16 tables, health 503, sanitized 500 PASS | Functional PASS |
| HMS-S03 / NF-005 | #3 | frontend/src/{App,api,auth}.jsx/js, components/ui.jsx, styles.css | TC-UX-01 frontend tests PASS; Chromium axe WCAG AA login/register light/dark and visible focus PASS | Fixed account-card contrast; focused browser coverage, not universal accessibility certification |
| HMS-S04 | #4 | .github/workflows/{ci,pr-checks,project-automation}.yml | 14 workflow tests PASS; protected main requires backend tests/frontend build | BLOCKED: administrator token and actual Project insertion proof; docs/CI_AUTOMATION.md |
| HMS-S05 | #5 | backend/scripts/seed.js, backend/tests/helpers.js | seed-helpers.test.js PASS | Existing closed issue; synthetic data only |
| HMS-F-001 | #6 | backend/src/routes/auth.js, frontend/src/pages/Register.jsx | TC-Auth-01 auth.test.js PASS | Existing closed issue |
| HMS-F-002 | #7 | routes/auth.js, src/app.js, Login.jsx, auth.jsx | TC-Auth-02 auth.test.js PASS; real browser login PASS | Functional PASS; production deployment not claimed |
| HMS-F-003 | #8 | routes/profile.js, Profile.jsx, Students.jsx | TC-Auth-03 auth.test.js and account UI tests PASS | Functional PASS |
| HMS-F-004 / SR-003 | #9 | middleware/auth.js, routes/admin.js, Users.jsx | TC-Auth-04 auth.test.js, audit tests PASS | Functional PASS |
| HMS-SR-002 | #10 | routes/{auth,admin}.js, config.js | TC-Sec-02 actual test DB hash inspection PASS; production cost configuration test PASS | No production DB inspection claimed |
| HMS-F-005 | #11 | routes/inventory.js, Inventory.jsx | TC-Room-01 room.test.js PASS | Existing closed issue |
| HMS-F-006 | #12 | routes/allocations.js, Allocations.jsx, MyRoom.jsx | TC-Room-02 allocations.test.js, real API/UI integration PASS | Existing closed issue; browser demo also exercises allocation |
| HMS-SR-005 | #15 | backend/src/utils/audit.js, routes/admin.js, Audit.jsx | audit unit/integration/endpoint tests PASS | Existing closed issue |
| HMS-F-009 | #16 | routes/complaints.js, Complaints.jsx | TC-Comp-01 complaints.test.js; real API/UI integration PASS | Functional PASS |
| HMS-F-010 | #17 | routes/complaints.js, components/ComplaintAssignment.jsx | TC-Comp-02 complaint-assignment.test.js; real API/UI integration PASS | Functional PASS; PR #44 has no formal review, owner confirmation outstanding |
| HMS-F-013 | #21 | routes/fees.js, schema.sql | TC-Admin-01 sprint1.test.js, fee-contract.test.js PASS | API scope only; no gateway/fee UI required |
| HMS-F-014 | #23 | routes/visitors.js, Visitors.jsx | TC-Admin-02 sprint1.test.js, visitors-leave.test.jsx PASS | Functional PASS; institutional visitor policy remains institution-defined |
| HMS-F-015 | #24 | routes/leave.js, routes/notifications.js, utils/notify.js, Leave.jsx, Notifications.jsx | TC-Admin-03; leave-notifications.test.js; real student inbox UI integration PASS | In-app delivery implemented; live SMTP unverified, no credentials configured |
| HMS-D01 | #35 | docs/demo/sprint1.mp4, scripts/demo-sprint1.cjs | See docs/demo/SPRINT1_RECORDING.md for measured duration and actual capture/QA | Subject to owner review of recording |

All 13 audited open issues remain open. The completion PR uses Refs rather than
Closes. Required owner review, merging by an authorized person, and administrative
verification remain gates to final closure. No Sprint 2 branch was merged.
