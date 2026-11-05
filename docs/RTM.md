# HMS requirements traceability — 2026-11-01

This execution companion supplements the unchanged submitted SRS/SAD RTMs. P below means the stated automated scope passed; it does not certify manual or deployment acceptance. Evidence follows the feature's owning PR and `docs/verification/`. N means acceptance remains unverified. The 2026-11-05 addendum below records P/F/A scope explicitly; A is a documented unexecuted/external exception, not a passing result or invented waiver. The upstream SRS identifies 16 FRs, five NFRs and five security requirements; issue22 is the frontend slice of F-013.

| Requirement | Cases | Evidence / scope | Outcome |
|---|---|---|---|
| F-001..004 | TC-Auth-01..04 | backend auth/shared contracts; account frontend tests | P, automated |
| F-005 | TC-Room-01 | inventory API persistence/deactivation and navigation | P, automated |
| F-006 | TC-Room-02 | allocation concurrency, eligibility, audit and notification | P, automated |
| F-007 | TC-Room-03 | PR61 allocations + real-session transfer/rollback tests | P, automated |
| F-008 | TC-Room-04 | PR62 check-in/out/history + real-session concurrency | P, automated |
| F-009..010 | TC-Comp-01..02 | complaint submission/assignment API and frontend tests | P, automated |
| F-011 | TC-Comp-03 | PR45 locked transitions, ownership, resolution details | P, automated |
| F-012 | TC-Comp-04 | PR46 notification persistence/retries/isolation/rollback | P, adapter scope; live SMTP N |
| F-013 | TC-Admin-01 | fee-contract API tests; PR48 frontend | P, automated |
| F-014..015 | TC-Admin-02..03 | Sprint1 API and live frontend service tests | P, automated |
| F-016 | TC-Admin-04 | PR51 six report types, period boundaries, CSV injection and roles | P, automated |
| NF-001 | TC-Perf-01 | PR49 actual-tree local benchmark | Local evidence only; deployed/browser N |
| NF-002 / #27 | TC-Perf-02 | Approved 100-session scope: requirements/HMS-NF-002-approved-change.md; verification/HMS-NF-002.md | Current 100-user execution recorded in the focused result below; historical 500-user failures preserved |
| NF-003 | TC-Rel-01 | PR50 semantic probes, unknown coverage, maintenance exclusions | Monitor tests only; monthly target N |
| NF-004 | TC-Rel-02 | PR60 isolated timed restore and real API chain verification | Local fixture only; daily deployed schedule N |
| NF-005 | TC-UX-01 | PR58 automated real-page axe/responsiveness, 375/768/1280 px | Manual screen-reader and full AA acceptance N |
| SR-001 | TC-Sec-01 | PR47 actual TLS handshakes and HTTP/proxy guard | Local protocol P; deployed certificate/domain N |
| SR-002 | TC-Sec-02 | salted bcrypt compatibility and production cost policy | P, automated |
| SR-003 | TC-Sec-03 | PR58 complete protected-route inventory/denied-role sessions | See PR58 evidence; manual acceptance separate |
| SR-004 | TC-Sec-04 | PR57 cross-student isolation; fail-closed critical-read audit | See PR57 evidence |
| SR-005 | TC-Sec-05 | chain tamper/head checks and transaction audit coverage | P, automated |

No production uptime, manual audit, video, v1.0 release or development freeze is asserted. See TEST_EXECUTION.md for execution boundaries and open acceptance items.


## 2026-11-05 execution/exception reconciliation (#34)

All planned HMS TC families are mapped below. P means the stated measured scope passed; F means an actual failure; A means a named unexecuted/manual/deployment exception with a next action. A does not authorize waiving acceptance or closing an operational issue. This register supplements the submitted SRS/STP via the focused HMS-NF-002 addendum and preserves dated original evidence.

| Planned cases | Actual scope / evidence | P/F/A and residual action |
|---|---|---|
| TC-Auth-01..04 | Current-main backend and combined CI; account/frontend tests and real browser registration/login/logout | P automated; synthetic accounts only |
| TC-Room-01..04 | Inventory, allocation concurrency/eligibility, atomic transfer and check-in/out/history tests in main CI | P automated, real MySQL/session scope |
| TC-Comp-01..04 | Submission, assignment, strict lifecycle, scoped persisted notifications and injected SMTP retries | P automated/adapter; A optional live SMTP delivery, no delivery claim |
| TC-Admin-01..04 | Decimal fee ledger, visitors, leave and six reports/date/CSV/role tests | P automated, main backend/frontend/combined CI |
| TC-Perf-01 | performance-local.json: 705/705 requests; login p90 2223.07ms, highest protected-read p90 102.34ms | P normal-load API; A production/browser sizing, not claimed |
| TC-Perf-02 | Current approved target 100; see verification/HMS-NF-002.md and new raw/audit evidence | Use actual current-run outcome; all dated 500-user F/P results retained, no inferred 100-user PASS |
| TC-Rel-01 | availability tests and short synthetic lifecycle observations; monthlyTargetVerified=false | P monitor calculation/probe behavior; A real deployment and complete monthly coverage (#28) |
| TC-Rel-02 | recovery-integration.json: 2s populated restore, 13 business-table counts, 14 original hashes preserved, restored API valid chain | P local restore; A actual daily scheduler/install and scheduled-run evidence (#29) |
| TC-UX-01 | Main Chrome/Firefox axe/overflow checks at 375/768/1280px; focused local rerun/new keyboard results below | P existing automated scope; A manual each-role keyboard/screen-reader acceptance (#30) |
| TC-Sec-01 | Real child-server TLS/proxy tests and reference nginx | P local TLS1.2/1.3, refused TLS1.0/1.1 and HTTP; A actual domain/certificate/topology evidence (#20) |
| TC-Sec-02 | bcrypt-compatible hashes and production cost12 regression; load fixture hash verified separately | P automated; no weaker production work factor |
| TC-Sec-03 | Complete protected-router role inventory, real sessions, anonymous 401/wrong-role 403 | P current-main CI |
| TC-Sec-04 | Cross-student profile/fees/complaint/visitor/leave isolation and fail-closed critical-read audits | P current-main CI |
| TC-Sec-05 | Audit tamper/head checks, transactional mutation/audit tests; load postcondition | P automated integrity scope; exact load result reported separately |

External exception owners/actions are specified in verification/PENDING_EXTERNAL_EVIDENCE.md. Existing current-main evidence is CI run 41976914388 on application 40c5135; new run source/configuration and exact results are recorded in TEST_EXECUTION.md. Required new documentation/test changes must be reviewed and merged before issue closure. No external acceptance sign-off is implied by this matrix.
