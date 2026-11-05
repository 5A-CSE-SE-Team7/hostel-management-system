# HMS requirements traceability — 2026-11-01

This companion supplements the submitted SRS/SAD RTMs for a **local-only college evaluation**. P records the measured test scope, not production certification. Evidence follows the feature's owning PR and `docs/verification/`. N means acceptance remains unverified. The 2026-11-05 addendum below records P/F/A scope explicitly; A is a documented unexecuted/external exception, not a passing result or invented waiver. The upstream SRS identifies 16 FRs, five NFRs and five security requirements; issue22 is the frontend slice of F-013.

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
| NF-001 | TC-Perf-01 | PR49 actual-tree local benchmark | P local API benchmark; browser render performance not measured |
| NF-002 / #27 | TC-Perf-02 | Approved 100-session scope: requirements/HMS-NF-002-approved-change.md; verification/HMS-NF-002.md | P: Node22 local 100/100 sessions and 6,562/6,562 protected requests, 2,695 valid audit rows; F: Node24 95/100 logins. Deployment A; historical 500-user evidence preserved |
| NF-003 | TC-Rel-01 | PR50 semantic probes, unknown coverage, maintenance exclusions | P local probe and availability-calculation tests; historical month-long target not measured |
| NF-004 | TC-Rel-02 | PR60 isolated timed restore and real API chain verification | P local restore and audit integrity; production scheduler not required |
| NF-005 | TC-UX-01 | PR58 automated real-page axe/responsiveness, 375/768/1280 px | P automated axe, keyboard and responsive checks; full WCAG certification not asserted |
| SR-001 | TC-Sec-01 | PR47 actual TLS handshakes and HTTP/proxy guard | P local TLS and HTTP enforcement; public domain/certificate not required |
| SR-002 | TC-Sec-02 | salted bcrypt compatibility and production cost policy | P, automated |
| SR-003 | TC-Sec-03 | PR58 complete protected-route inventory/denied-role sessions | See PR58 evidence; manual acceptance separate |
| SR-004 | TC-Sec-04 | PR57 cross-student isolation; fail-closed critical-read audit | See PR57 evidence |
| SR-005 | TC-Sec-05 | chain tamper/head checks and transaction audit coverage | P, automated |

No production uptime or full WCAG certification is claimed or required for the local evaluation. Demo video, release tag and freeze remain separate team deliverables. See TEST_EXECUTION.md for execution boundaries and open acceptance items.


## 2026-11-05 execution/exception reconciliation (#34)

All planned HMS TC families are mapped below. P means the stated measured scope passed; F means an actual failure; A means a named unexecuted/manual/deployment exception with a next action. A does not convert missing tests into passing results; use the approved local acceptance criteria to determine completion. This register supplements the submitted SRS/STP via the focused HMS-NF-002 addendum and preserves dated original evidence.

| Planned cases | Actual scope / evidence | P/F/A and residual action |
|---|---|---|
| TC-Auth-01..04 | Current-main backend and combined CI; account/frontend tests and real browser registration/login/logout | P automated; synthetic accounts only |
| TC-Room-01..04 | Inventory, allocation concurrency/eligibility, atomic transfer and check-in/out/history tests in main CI | P automated, real MySQL/session scope |
| TC-Comp-01..04 | Submission, assignment, strict lifecycle, scoped persisted notifications and injected SMTP retries | P automated/adapter; A optional live SMTP delivery, no delivery claim |
| TC-Admin-01..04 | Decimal fee ledger, visitors, leave and six reports/date/CSV/role tests | P automated, main backend/frontend/combined CI |
| TC-Perf-01 | performance-local.json: 705/705 requests; login p90 2223.07ms, highest protected-read p90 102.34ms | P normal-load local API; browser render timings not claimed |
| TC-Perf-02 | Current approved target 100; see verification/HMS-NF-002.md and new raw/audit evidence | P Node22 local: 100 sessions, 6,562/6,562 requests, valid 2,695-event chain; F managed Node24: 95/100 logins. Node22 local P, Node24 F retained as a runtime limitation; historical 500-user runs preserved |
| TC-Rel-01 | availability tests and short synthetic lifecycle observations; monthlyTargetVerified=false | P local monitor/probe behavior; monthly 99.5% achievement not claimed or required in local-only evaluation |
| TC-Rel-02 | recovery-integration.json: 2s populated restore, 13 business-table counts, 14 original hashes preserved, restored API valid chain | P local populated restore/audit integrity; deployed scheduler is optional |
| TC-UX-01 | Main Chrome/Firefox axe/overflow checks at 375/768/1280px; focused local rerun/new keyboard results below | P: nine local Chromium scenarios, including four real-role keyboard tests; prior ten Chrome/Firefox scenarios. P automated role keyboard/axe scope; no manual screen-reader certification claim |
| TC-Sec-01 | Real child-server TLS/proxy tests and reference nginx | P local TLS1.2/1.3, refused TLS1.0/1.1 and HTTP; P local TLS tests; production domain/certificate outside evaluation scope |
| TC-Sec-02 | bcrypt-compatible hashes and production cost12 regression; load fixture hash verified separately | P automated; no weaker production work factor |
| TC-Sec-03 | Complete protected-router role inventory, real sessions, anonymous 401/wrong-role 403 | P current-main CI |
| TC-Sec-04 | Cross-student profile/fees/complaint/visitor/leave isolation and fail-closed critical-read audits | P current-main CI |
| TC-Sec-05 | Audit tamper/head checks, transactional mutation/audit tests; load postcondition | P automated integrity scope; exact load result reported separately |

Local evidence criteria and optional production follow-ups are recorded in verification/PENDING_EXTERNAL_EVIDENCE.md. Existing current-main evidence is CI run 41976914388 on application 40c5135; new run source/configuration and exact results are recorded in TEST_EXECUTION.md. Only close issues after the relevant local acceptance evidence and documentation are merged. No production or third-party certification is implied.
