# Local HMS acceptance evidence and optional deployment follow-ups — 2026-11-05

The HMS coursework is **run and evaluated locally**. The team reports instructor approval for local-only evaluation; the approved HMS-NF-002 quantitative target is **100 concurrent authenticated sessions** (see `docs/requirements/HMS-NF-002-approved-change.md`). The revised GitHub issues #20, #30, #29 and #28 describe the required local checks. This document records real evidence and what was not performed. It **does not certify production deployment, full WCAG AA conformance, a month of uptime, or any unexecuted test**.

Scope: issues #20, #30, #27, #29, #28, #37 and #34. Demo issue #36 and final-freeze issue #38 are outside this reconciliation.

## #20 — HTTPS/TLS: local acceptance

- Real child-server tests verified HTTPS/TLS 1.2 and 1.3 negotiation, refused TLS 1.0/1.1, and exercised HTTP/forged-proxy rejection. See `docs/verification/HMS-SR-001.md`, `backend/tests/tls.test.js` and the merged CI results.
- Check the recorded passing test run against the final source commit. Local development HTTP, where explicitly configured, is **not** encrypted and must not be represented as HTTPS.
- A publicly trusted certificate, real hostname and externally hosted reverse proxy were **not configured** and are **not required** for the local academic acceptance.

Optional if HMS is ever deployed: verify actual certificate hostname/chain, TLS version refusal, HSTS/Secure cookies and that the public HTTP endpoint cannot bypass HTTPS enforcement.

## #30 — accessibility: local acceptance

- Merged Chrome/Firefox browser regressions exercise responsive pages at 375, 768 and 1280 px, real role-based keyboard navigation and axe checks. See `docs/TEST_EXECUTION.md` and the PR #64 evidence.
- Required local evidence is passing automated browser/axe/keyboard tests with no critical axe violations on the tested pages. Record actual failing checks, if any.
- A formal human screen-reader certification **has not been performed** and is **not a local-project completion prerequisite**. Passing axe and keyboard tests does not prove complete WCAG 2.1 AA conformance.

Optional later: a manual keyboard and assistive-technology audit with documented tester, device, defects and retests.

## #29 — backup and recovery: local acceptance

- Genuine synthetic-data backup/restore evidence reported **2 seconds** to restore; counts across 13 business tables and the preserved audit hash chain were verified. See `docs/verification/HMS-NF-004.md` and `docs/evidence/recovery-integration.json`.
- Required local demonstration is producing a real backup archive, restoring it to an **isolated test database**, verifying restored data and audit integrity, and measuring completion within **30 minutes**. Existing error-guard tests must remain passing.
- Installing cron on a deployed host and waiting for an actual daily production job is **not required** for a local college demonstration. `docs/OPERATIONS.md` retains scheduling as optional reference instructions.

Optional later: deploy a securely configured daily scheduler, verify retention, and restore one of its genuine scheduled archives.

## #28 — health monitoring: local acceptance

- Existing tests verify the actual `/api/health` response, success/failure probe handling, coverage/UNKNOWN accounting and maintenance exclusions. See `docs/verification/HMS-NF-003.md` and monitoring evidence.
- Required local evidence is a working endpoint and tested monitor/reporting behavior using actual local observations or labeled deterministic test fixtures.
- The original **99.5% monthly availability** aspiration was **not verified** by a complete calendar month. It is not a mandatory observation period for the agreed local-only evaluation. Never convert short local observations into a claim of achieving a month-long SLA.

Optional later: independently monitor a hosted HTTPS health endpoint for a full month and report real coverage, maintenance and measured availability.

## #27 — approved 100-user load test

- PR #64 documented a qualified local PASS on Node.js 22: **100/100** persisted sessions, **6,562/6,562** protected requests and a valid **2,695-event** audit chain, under bcrypt cost 12, pool 20, 300-second login ramp, 30-second sustained traffic and 5,000-ms timeout.
- A managed Node.js 24 run failed **95/100** logins. That failure and the historical unsuccessful 500-user results remain in the repository; the Node.js versions must not be conflated. These measurements do not establish universal production capacity.

## #37 and #34 — documentation and RTM

- Review the merged approved change, actual test case mappings and dated source evidence in `docs/DEVIATIONS.md`, `docs/RTM.md` and `docs/TEST_EXECUTION.md`.
- Mark a test PASS only for its measured scope. Document genuine unperformed checks as limitations instead of fabricating results. The local-only scope is **not** an assertion of production certification.
- Close each issue only if its currently approved GitHub acceptance criteria are met by merged, verifiable evidence.

## History preserved

Previous production-oriented checklists and historical failing benchmark outputs remain traceable through Git history and the original evidence files. These revised local criteria do **not** modify the application's runtime, authentication, database schema or tests. No issues are closed by this documentation change.
