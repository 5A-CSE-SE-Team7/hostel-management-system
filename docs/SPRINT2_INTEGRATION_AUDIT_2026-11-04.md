# Sprint 2 Integration Audit — 2026-11-04

**Verdict: BLOCKED — #59 does not meet zero-failure 500-user acceptance.** Source integration is repaired; green CI is not scalability acceptance. No PR was merged, approved or closed.

## Baseline and scope

Verified main: `5e8e991c97694d882f3c66cccef5de3936e5fad9`. Sprint 1 completion #63 and Sprint 2 #61 (transfer), #62 (check-in/out), #45 (maintenance progress/resolution) are merged. All ten audited PRs remain open and target main. Main remains protected with required backend tests and frontend build. Protection, CODEOWNERS, Project settings and draft states were not changed.

## PR repairs and actual stage verification

All branches preserve their original heads as ancestors and use normal merge commits. Later branches intentionally include prerequisite commits until earlier PRs merge. Counts below identify full versus focused backend checks; all stages also ran the actual frontend suite, real HTTP/MySQL UI integration, production build, dependency audits and workflow tests. The final cumulative backend suite ran in full.

| PR | Problem / repair | Backend tests | Frontend / live integration | Recorded source | Readiness |
|---|---|---:|---|---|---|
| [#46](https://github.com/5A-CSE-SE-Team7/hostel-management-system/pull/46) | Direct add/add inbox conflicts and App overlap; retained richer scoped inbox/read/unread controls, main Dashboard and room workflows. Fixed dynamic accessible-link selector plus bounded real-HTTP UI synchronization. | 89 (full) | 3 passed (3); 58 passed (58) | `efe17663` | Conditionally ready for required owner review / acceptance evidence |
| [#48](https://github.com/5A-CSE-SE-Team7/hostel-management-system/pull/48) | Inherited outdated notification/main history; merged repaired #46 and retained canonical fee UI and role routes. | 89 (full) | 3 passed (3); 65 passed (65) | `2aa5f13a` | Conditionally ready for required owner review / acceptance evidence |
| [#51](https://github.com/5A-CSE-SE-Team7/hostel-management-system/pull/51) | Inherited old App/main; merged repaired #48, retained reports and canonical modules. Corrected stale video claims after team removal. | 93 (full) | 4 passed (4); 67 passed (67) | `e67aa81a` | Conditionally ready for required owner review / acceptance evidence |
| [#47](https://github.com/5A-CSE-SE-Team7/hostel-management-system/pull/47) | Inherited stale prerequisite chain; merged repaired #51 without weakening trusted-proxy, HTTPS, TLS or secure cookies. | 7 (focused) | 4 passed (4); 67 passed (67) | `3b45e272` | Conditionally ready for required owner review / acceptance evidence |
| [#57](https://github.com/5A-CSE-SE-Team7/hostel-management-system/pull/57) | Inherited stale prerequisites; merged repaired #47 and retained cross-student isolation and strict critical-read auditing. | 6 (focused) | 4 passed (4); 67 passed (67) | `3cd3d810` | Conditionally ready for required owner review / acceptance evidence |
| [#58](https://github.com/5A-CSE-SE-Team7/hostel-management-system/pull/58) | Direct CSS conflict; retained responsive/reduced-motion/long-identity rules and Sprint 1 contrast. Preserved main routes and dashboard. | 5 (focused) | 4 passed (4); 67 passed (67) | `09cd243d` | Conditionally ready for required owner review / acceptance evidence |
| [#59](https://github.com/5A-CSE-SE-Team7/hostel-management-system/pull/59) | Inherited old chain; integrated #58. Retained native bcrypt/cost12 and pool20. Recorded both reproduced stress failures; rejected worker tuning. | 16 (focused) | 4 passed (4); 67 passed (67) | `46d3ec8b` | BLOCKED: measured 500-user failures |
| [#49](https://github.com/5A-CSE-SE-Team7/hostel-management-system/pull/49) | Inherited old chain; integrated #59. Recorded current API normal-load pass separately from scalability failure. | 11 (focused) | 4 passed (4); 67 passed (67) | `636d78ac` | Blocked behind #59; scope checks pass |
| [#60](https://github.com/5A-CSE-SE-Team7/hostel-management-system/pull/60) | Inherited old chain; integrated #49. Recorded populated two-second restore with preserved audit hashes. | 6 (focused) | 4 passed (4); 67 passed (67) | `f2e69590` | Blocked behind #59; scope checks pass |
| [#50](https://github.com/5A-CSE-SE-Team7/hostel-management-system/pull/50) | Integrated complete repaired chain; retained semantic monitoring/unknown coverage. Added consolidated audit evidence; no monthly uptime claim. | 108 (full) | 4 passed (4); 67 passed (67) | `f3c43c3a` | Blocked behind #59; scope checks pass |

PR #50 source above precedes this report-only commit; its current GitHub head identifies the evidence commit. Full SHAs and phase results are in [integration-2026-11-04.json](evidence/integration-2026-11-04.json). Follow-up selector/setup changes were test-only, verified by a separate three-test real-HTTP inbox regression and fresh GitHub CI. No page-performance threshold was relaxed.

## Final verification and preserved features

- Final application `8982493`: **108 backend, 67 frontend, 4 real API/MySQL UI integration tests passed**, production build passed, both audits zero vulnerabilities. All 15 workflow tests and actionlint passed.
- Local Chromium: five scenarios passed (three isolated/mocked UI scenarios, two real backend/MySQL scenarios). Live registration, allocation, complaint/assignment/resolution, all role pages, axe WCAG scans and 375/768/1280px overflow checks passed. Local Firefox download was blocked with HTTP 403 Domain forbidden; GitHub job [126729834515](https://github.com/5A-CSE-SE-Team7/hostel-management-system/actions/runs/41874412113/job/126729834515) independently ran and passed five Chrome plus five Firefox scenarios on the recorded #59 source.
- All ten product-commit CI sets passed. CI snapshot records exact check URLs and SHAs; subsequent evidence-only commits rerun CI independently. Approvals are separate gates.
- Preserved authentication, role-filtered routes, student inbox, maintenance Dashboard/resolution, inventory/allocation/transfer/check-in/out/history, fee/visitor/leave/report modules, transaction guards, audit chain, and required CI. Allocation backend code is unchanged from merged main; frontend differences are accessibility labels/headings.
- A first unchanged #48 run hit the default one-second login wait; rerun passed. A later #59 UI regression exposed the asynchronous unread badge changing the exact accessible link name. The anchored selector now permits only the intended label/badge format and asserts `/notifications`; the rendered leave-message assertion remains. Functional real-HTTP waits are bounded to five seconds; independent performance thresholds remain 3000ms.
- Initial npm installs hit a read-only cache; reruns used a writable task cache. No lockfile workaround or dependency downgrade was introduced.

## Measured performance, recovery and reliability

- **Normal load PASS:** 705 requests, zero errors, five sessions, twenty iterations; login p90 2223.07ms; largest protected-read p90 102.34ms. Every original 3000ms threshold passed. Fixture counts and EXPLAIN plans are retained. API performance does not prove browser/deployed performance.
- **Default 500-user FAIL:** 490/500 authenticated; 4712/4861 protected requests succeeded, 149 errors, p90 4636.31ms.
- **Two-worker replay FAIL:** 410/500 authenticated; 1841/3252 protected requests succeeded (56.61%). The measured two-CPU quota motivated this controlled experiment; it was worse and is not recommended. Both kept cost12, pool20, 500 requested sessions, 300-second preparation, 30-second sustained traffic, 5000ms timeout and unchanged pass assertions. Requests returning headers but failing body reads were counted as failures. The specific bottleneck is not proven; do not equate timeouts with authorization defects.
- Both failures and the rejected runtime settings are committed as `scalability-integration-*-failed.json` / `scalability-integration-runtime.json`. Earlier PASS records remain historical; they do not supersede these failures. The fixture uses independent sessions sharing one synthetic account, not 500 diverse records.
- **Restore PASS locally:** two seconds into a separate synthetic target; 13 business table counts matched, including nonempty allocation/complaint/fees/payment/visitor/leave/notification data. Fourteen original audit hashes matched byte-for-byte; the restored API verified 16 events after additional reads. See [recovery evidence](evidence/recovery-integration.json). Production-sized recovery/scheduling remain unverified.
- Actual local health probe returned HTTP200/status ok. Monitoring tests preserve unknown coverage and maintenance rules. No deployed-month 99.5% result is claimed.

## Progressive merge proof and next actions

A fresh temporary worktree started at verified main and normal-merged **#46 → #48 → #51 → #47 → #57 → #58 → #59 → #49 → #60 → #50**. Every merge completed without unresolved paths; the final tree matched the cumulative PR50 tree. The product code, schemas, manifests and lockfiles are unchanged from the measured application after evidence-only follow-ups. This proves source compatibility, not scalability readiness.

1. **Resolve #59 before proceeding beyond it:** profile request/session/audit/DB waits and CPU on an isolated representative host, implement justified remediation, then rerun the unchanged 500-user success criteria. Neither measured configuration passes.
2. Obtain required repository/CODEOWNERS reviews; #47/#58/#49/#50 remain drafts. No approvals were fabricated or bypassed. Full administrator bypass/review settings are not exposed by this connection.
3. Complete deployment TLS/domain/certificate evidence, live authorized SMTP delivery, manual screen-reader acceptance, production backup scheduling and production-sized restore verification, and complete monthly uptime coverage.
4. Supply the replacement team Sprint 2 video (#36); the team removed the earlier video in `04b82ce`. Do not treat historical video text as a present deliverable. #34 evidence/exception sign-off and #38 release tag/freeze/milestone closure remain owner actions and were not performed.
5. Keep the validated source order above. Earlier PRs can be reviewed on their own scope; #49/#60/#50 remain behind the failed #59 acceptance gate.

No source conflicts remain in the simulated sequence. The overall verdict remains **BLOCKED**, despite functional CI passing.
