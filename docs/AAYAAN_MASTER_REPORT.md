# Aayaan HMS master implementation and ownership report

Student: Aayaan Kamil, PES2UG24CS017. Checkpoint: 2026-10-29. Main remains 3fc386a14454f296eb6ba7af94bef979425fc86b. No main push, force push, merge, teammate branch modification, branch-protection change or fabricated PR was performed.

All ten assigned scopes have implementations. Eight task branches were implemented/pushed in this continuation; existing PRs #40/#41 were updated. **Zero new PRs were created**: all eight creation calls returned `Post https://api.github.com/graphql: Forbidden`. Public PR listing independently shows only #39, #40, #41 and teammate #42. Thus **2/10 genuine PR deliverables exist**, eight remain submission-blocked. No task is claimed fully accepted/integrated on main; local temporary integration is distinct from main or GitHub CI. See PR_SUBMISSION_QUEUE.md for exact titles/bases/bodies; use the separate authorized GitHub integration, not invented URLs.

## All ten tasks

Commit SHAs below identify the verified implementation commits; this report is a later documentation-only commit on the performance branch.

| Requirement | GitHub issue | PR URL | Branch | Commit SHA | Implementation status | CI status | Blocker ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HMS-S03 | [#3](https://github.com/5A-CSE-SE-Team7/hostel-management-system/issues/3) | [#40](https://github.com/5A-CSE-SE-Team7/hostel-management-system/pull/40) | `feature/HMS-S03-react-frontend` | `1b193480dc8bb2b61bf542bd1d56929334a63873` | Implemented; M1 integration and overlap review pending | Build/reference PASS; backend/audit FAIL | C: unmerged M1/M2/S04; overlapping #39/#42 |
| HMS-S04 | [#4](https://github.com/5A-CSE-SE-Team7/hostel-management-system/issues/4) | [#41](https://github.com/5A-CSE-SE-Team7/hostel-management-system/pull/41) | `feature/HMS-S04-ci-automation` | `ff07aa517b009a98686b5bf0237f5c3bdd284726` | Implemented; owner acceptance pending | Audits/workflow/reference PASS; backend/frontend FAIL | C: unmerged source; D: Project/protection |
| HMS-F-009 | [#16](https://github.com/5A-CSE-SE-Team7/hostel-management-system/issues/16) | NOT CREATED — API denied | `feature/HMS-F-009-complaint-submission` | `a37dd522d9876b85f2162a0be87a3b7dbcd1233c` | Implemented; real integration fixture PASS | NOT RUN: PR creation denied | D: PR API; C: upstream integration |
| HMS-F-010 | [#17](https://github.com/5A-CSE-SE-Team7/hostel-management-system/issues/17) | NOT CREATED — API denied | `feature/HMS-F-010-complaint-assignment` | `e22a33b2f890cc722881f46a85b38fe638423757` | Implemented; real integration fixture PASS | NOT RUN: PR creation denied | D: PR API; C: prerequisite stack |
| HMS-F-011 | [#18](https://github.com/5A-CSE-SE-Team7/hostel-management-system/issues/18) | NOT CREATED — API denied | `feature/HMS-F-011-maintenance-resolution` | `daeb31718f5911a44af0c90852b06cb88e45e7a2` | Implemented; real integration fixture PASS | NOT RUN: PR creation denied | D: PR API; C: prerequisite stack |
| HMS-F-012 | [#19](https://github.com/5A-CSE-SE-Team7/hostel-management-system/issues/19) | NOT CREATED — API denied | `feature/HMS-F-012-complaint-notifications` | `3101366098b903b7f88d1626a16262c489522e74` | Implemented; latest PR42 integration PASS | NOT RUN: PR creation denied | D: PR API; C: stack; external SMTP NOT RUN |
| HMS-SR-001 | [#20](https://github.com/5A-CSE-SE-Team7/hostel-management-system/issues/20) | NOT CREATED — API denied | `feature/HMS-SR-001-https-tls` | `105ad79ffae2aa9447ef3297adf5545f8779af63` | Implemented; real local TLS PASS | NOT RUN: PR creation denied | D: PR API; deployment certificate/domain |
| HMS-F-013U | [#22](https://github.com/5A-CSE-SE-Team7/hostel-management-system/issues/22) | NOT CREATED — API denied | `feature/HMS-F-013U-fee-frontend` | `71ed9c3d11c6b909ba2da55109ebe5baa8062ac0` | Implemented; real M4 API fixture PASS | NOT RUN: PR creation denied | D: PR API; C: M4 ownership/STAFF contract |
| HMS-NF-001 | [#26](https://github.com/5A-CSE-SE-Team7/hostel-management-system/issues/26) | NOT CREATED — API denied | `feature/HMS-NF-001-performance` | `84d21988690ec3133c805e684a81f1af9be39bcf` | Implemented; local workload PASS; production/browser pending | NOT RUN: PR creation denied | D: PR API; deployment performance evidence |
| HMS-NF-003 | [#28](https://github.com/5A-CSE-SE-Team7/hostel-management-system/issues/28) | NOT CREATED — API denied | `feature/HMS-NF-003-availability` | `116a439be1a3bbaabf1c0897e1ecfa2988033792` | Implemented; monitoring tests PASS; monthly acceptance pending | NOT RUN: PR creation denied | D: PR API; monitor deployment/time coverage |

## Validation evidence

- S03 flat-session adapter fix: 10 UI tests and build PASS locally with patched tooling; current remote build/reference PASS. This fixed our own verified API mismatch (A/C).
- S04: 12 CI utility tests/actionlint PASS; current GitHub audits and workflow/reference checks PASS. Correct action SHA association and stacked PR filters are fixed (E). Backend/frontend source integration remains nonzero, not bypassed.
- Complaint stack latest fixture: **22 backend tests, 21 frontend tests, build and both full dependency audits PASS** using real PR #42 auth (fb7b11c), real M2 hashing (17ad39d), patched S04 dependencies and MySQL hms_test. The expected audit fault-injection log verifies rollback. Earlier F009/F010/F011 reports preserve their own run counts; do not add overlapping counts as unique coverage.
- Fee frontend: 15 UI tests/build plus one real M1/M2/M4 database/API contract test PASS; both dependency audits clean in the fixture. The fee backend was not modified. Tests use the pinned original M1 contract required by M4.
- TLS: two actual child-server protocol tests PASS: TLS 1.2/1.3 accepted with CA validation; TLS 1.0/1.1 refused; HTTP/spoofed header rejected; HSTS checked. Public production deployment NOT RUN.
- Performance: two runner tests PASS; 605 authenticated requests on a documented synthetic dataset, zero errors, all workload p90 <=3000ms. Login p90 524.85ms; other endpoint p90 9.43–26.17ms. Raw timings and actual EXPLAIN plans are in docs/evidence on this branch. Browser/production/500-user claims are NOT made.
- Availability: three tests PASS, one actual local health observation; October coverage 0.002240143369175627%, monthlyTargetVerified=false. Raw evidence is on the availability branch. Timer deployment and full-month target are BLOCKED by real host setup/time, not fabricated observations.

## Actual GitHub CI audit and failure classification

Full signed-in logs/API remain inaccessible (Forbidden). Public job pages expose real step/error annotations and outcomes; these were read, and source/commands reproduced locally. Evidence snapshot: docs/evidence/github-ci-observations.json. Technical causes below distinguish observed annotations from local reproduction.

| PR / failure | Category | Direct cause and evidence | Owner/dependency and smallest fix | Verified outcome |
| --- | --- | --- | --- | --- |
| #39/#40 backend unit job | C (unmerged dependency; baseline failure) | Job annotation Unit tests exit 1; local baseline import fails at tests/unit.test.js -> utils/audit.js, then middleware/auth.js | Actual modules now exist in M1/M2 branches and #42; review/integrate rather than invent stubs | FAIL on those PR snapshots; PASS in our genuine combined fixture |
| #39/#40 dependency audit | C (shared vulnerable baseline); S04 remediation | Actual failing step backend npm audit --audit-level=high; local audit identified nested mysql2 and Nodemailer | Integrate S04 patched lockfiles/override; frontend tooling fixes are also in S04 | FAIL on old graphs; both actual #41 audit jobs PASS |
| #39 add-to-project; older Project run on #40 | D | Actual error Input required and not supplied: github-token | Owner verifies PROJECT_URL/ADD_TO_PROJECT_PAT access and successful real board insertion. Current secret state cannot be inspected; do not assume historic failure proves a duplicate secret is needed | Historical FAIL; no new successful Project run claimed |
| #41 backend unit + integration | C | Actual annotations Unit tests and Integration tests exit 1; standalone branch lacks module dependencies/integration suites | Integrate reviewed M1/M2 and real module tests; preserve failing checks | FAIL remotely; actual full complaint fixture PASS |
| #41 frontend tests/build | C | Actual annotations both steps exit 1; branch is independent from unmerged S03, missing source/tests | Reconcile #40/#41 package overlap and integrate source, then rerun | FAIL remotely; S03+S04 fixture PASS |
| #41 original Set up job failures | E, our defect | Checkout/setup-node SHAs were swapped | Correct pins, verify official manifests and retain regression test | Fixed; actual workflow validation/audits execute and PASS |
| #40 session adapter mismatch | A/C, our defect | Genuine M1 /me returns flat user; our original client expected wrapper | Fixed on S03 1b19348; regression covers actual shape | Local tests/build PASS; current remote build PASS |
| Stacked-PR CI omission | E, our defect | Original CI branch filter targeted only main | S04 ff07aa5 permits all pull requests; no checks removed | Workflow tests/lint PASS; newly submitted stack PR execution still NOT RUN |
| New #42 shared integration contracts | C | Actual PR #42 lacks STAFF export used by older M2/M4/profile/reports; overlaps frontend files in #40 and hashing in M2 | Teammate owners reconcile STAFF and audit ownership; preserve tested contracts. Our complaint code needs no STAFF export | Our latest PR42-based complaint fixture PASS; broader M2/M4 merge NOT verified |
| New #42 dependency audit | C | Actual backend audit step exit 1; same baseline dependency graph. Its backend and frontend jobs PASS | Integrate S04 dependency remediation after owner review | Backend/frontend PASS, audit FAIL on actual run 40913097758 |
| Eight new PR creation requests | D | Every actual GraphQL call returned Forbidden; Git pushes succeed | Restore authorized GitHub API capability or use the separate integration with exact queue metadata | Eight branches verified pushed, zero new PRs created |
| Remaining signed-in log/settings details | F | Evidence unavailable through current API | Inspect with authorized access; do not guess credentials, protection state or unseen log output | BLOCKED, no unsupported ownership claim |

Backlog-reference jobs now PASS on #39/#40/#41; their earlier metadata failures are resolved and validators were not weakened. Node/Ubuntu migration notices are warnings, not the current failure causes.

## Shared frontend and ownership coordination

PR #39 is a minimal standalone welcome entry; it is not merged or modified by us. #40 provides the functional shell. #42 independently introduces main/App/api/auth/styles plus Login/Register, so the owner must review those shared files together. Preserve registration/login feature logic while retaining #40's accessible shell and actual flat-session contract; do not merge competing entries independently. The user's #39 approval is recorded on GitHub and was not bypassed.

The old M3 starter branch remains untouched. It bundles multiple tasks, so the new task stack is the reviewable replacement contribution path, not an extra merge of the old branch. #22 fee frontend is on its own branch; M4 owner must choose that contribution instead of also merging the old Fees.jsx. F012 preserves M4's notify(userId,type,message,ref) adapter signature. No teammate PR was changed or reviewed on their behalf.

## Owner actions, review and merge order

1. Use the verified queue to create eight genuine draft PRs. Existing #40/#41 remain the only user task PRs actually verified. Request aadi-basal-06 review through authorized GitHub access; do not self-approve or merge.
2. Coordinate #39/#40/#42 frontend overlap, M1's STAFF contract and M2's hash-chain ownership. #42 now has genuine auth/audit code; do not continue labelling it absent everywhere. It remains unmerged on main.
3. Review shared prerequisites together: S03 shell + M1 auth + M2 audit + S04 dependency/workflow tooling. Keep patched dependency versions and regenerate lockfiles when resolving package conflicts. PR #41 alone failing missing-source checks is an integration dependency, not an excuse to remove protection. Actual owner-led integration must satisfy existing rules.
4. Review complaint stack in order: F009 -> F010 -> F011 -> F012. Stacked bases are recorded in each queue entry. Reconcile app mount lines with M1/M2, then rerun real integration and GitHub checks after each prerequisite change. No merges were performed by this agent.
5. Review fee frontend with M4 after M1/S03 and notify adapter contracts align. Review TLS/monitor/performance branches independently, then rerun against the combined application; deployment and monitoring require actual environment values.
6. Owner verifies Project credentials/permissions and board membership, and required backend/frontend/reference/workflow checks on main. Existing protections/approvals remain intact; no bypass is proposed. See S04 docs/CI_AUTOMATION.md for exact settings.
7. Supply real certificate/domain/monitor host, run actual production TLS/performance checks, and collect a completed month of monitored data before closing corresponding acceptance items.

No unfinished work is running in the background. All isolated API test/benchmark processes were stopped by their harnesses. Implementation is checkpointed; PR submission, review/integration and operational acceptance remain explicitly pending.
