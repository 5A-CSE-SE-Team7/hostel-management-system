# HMS test plan — remediation baseline

Authority: submitted HMS SRS v1.0 (11 September 2026), SAD v1.0 (14 September 2026), and live GitHub acceptance criteria. The supplied STP PDF is an ATM sample template; its ATM cases are not HMS requirements. This plan instantiates the template for the documented HMS scope without adding product requirements.

Scope: accounts, inventory/allocation/transfer/check-in/out, complaint lifecycle/notifications, fee records, visitors, leave, reporting, server authorization, critical-read auditing, TLS, performance/scalability, recoverability and accessibility. Payment gateways, biometric hardware and unspecified external integrations remain excluded.

Current scalability scope: SRS HMS-NF-002 / STP TC-Perf-02 uses the instructor-approved **100 concurrent authenticated users**, as recorded in [the focused requirement addendum](requirements/HMS-NF-002-approved-change.md). Retain cost12, pool20, 300-second preparation, 30-second sustained traffic, 5,000 ms timeout, distinct persisted sessions, zero failed protected requests and audit integrity. The only current scalability acceptance threshold is 100 independently authenticated users. Historical testing records are not current acceptance criteria.

Levels: unit/component; API + real MySQL integration; browser journeys with real sessions; operational/manual acceptance. Use synthetic identities only. Backend tests may reset only a database ending `_test`; the main suite explicitly uses `hms_test`. Browser tests use separately seeded `hms_e2e`. Performance and restore drills must use disposable named fixtures and retain source identity and environment metadata.

Entry criteria: immutable source identified, locked dependencies installed, MySQL reachable, fixtures isolated, prerequisite branches integrated. Required CI tests must remain nonzero on failure. Compare tested code with latest main and inspect code-owner review requirements before integration.

Execution: `npm test --prefix backend`, `npm test --prefix frontend`, `npm run build --prefix frontend`, independent `npm audit --audit-level=high`, CI workflow tests, and the actual-tree combined runner. Browser suite: `npm run test:e2e --prefix frontend` after seeding its separate database. Functionality-specific scripts and limitations are in `docs/verification/`. The full integrated browser/RBAC suite is supplied by PR58; operational workloads by PR49/59/60/50.

Exit criteria (SRS section 6): high-priority functional requirements implemented and verified; no critical NFR/security failures; RTM records outcomes and exceptions. Issue34 additionally requires every planned case executed or a documented exception. Automated accessibility does not certify comprehensive WCAG AA compliance. The local assessment relies on actual local functionality, TLS, recovery, monitoring and performance tests; month-long production uptime and hosted TLS evidence are not acceptance gates.

Record case/requirement, tested commit, environment, actual result, defect and residual risk. Do not replace N with P solely because a PR exists. Public deployment and independent production sign-off are outside the local college-project acceptance scope. Retain clearly labeled unperformed tests without treating unrelated production operations as submission blockers. No release tag, demo approval or freeze is implied by this plan.
