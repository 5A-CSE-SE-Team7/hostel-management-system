> Historical 500-user integration acceptance (2026-11-04): TC-Perf-02 / HMS-NF-002 is **F**. Both current 500-user runs failed; do not close #27 or infer scale readiness from functional CI. See verification/HMS-NF-002.md and the committed scalability-integration failure samples. Historical results below remain dated evidence.

# Sprint 2 test execution and residual acceptance

2026-11-01: all results below use synthetic data. This document records verified scope and explicit exceptions; it does not close issues34/36/38.

At PR51's corrected application scope: **92 backend tests, 67 frontend tests and the production build passed** on Node24/MySQL8. The added report regression covers check-out of an allocation created before the selected month, historical end-date occupancy, six report APIs/CSV, invalid dates and denied student/maintenance roles. Notification storage failure was separately exercised through real SQL and rolled back the complaint transition/audit together.

Broader verification is owned by the later dependent PRs: PR57 adds audited sensitive-read failure handling; PR58 adds a complete protected-route matrix and real browser registration -> complaint -> allocation -> maintenance-resolution journey plus responsive axe scans. PR49/59 retain raw local performance/scalability records, including failures; PR60 records a two-second isolated recovery with genuine API audit verification. Exact source identities and scope limits accompany these records.

Exceptions: Firefox could not be downloaded locally because the environment blocks the download domains; inspect the actual GitHub browser job. A manual screen-reader walkthrough, production-domain TLS capture, production-sized performance/recovery, deployed daily backup scheduling and a completed month of independent uptime observations remain unverified. The supplied generic ATM STP is not represented as an executed HMS suite; TEST_PLAN.md defines the documented HMS execution scope.

Issue36 remains incomplete: the team removed the earlier recording in commit `04b82ce` for a replacement team recording. No current `docs/demo/sprint2.mp4` is present; record all four roles/modules and obtain reviewer acceptance. Issue38 remains incomplete: no v1.0 tag, sprint closure or development freeze was performed. Issue34 requires reviewer reconciliation of all evidence/exceptions with the submitted RTM before sign-off. Historical files saying “main unchanged” refer to earlier snapshots and must not override current GitHub state. No PR merge or approval is authorized by these results.

Final broader local verification passed 107 backend tests and 67 frontend tests/build; real Chrome/Firefox CI passed ten browser scenarios. Final isolated performance/scalability results and earlier failures remain in the owning PR evidence; local results do not certify production sizing.


## Focused seven-issue continuation — 2026-11-05

Scope is limited to #20, #30, #27, #29, #28, #37 and #34. The supplied official instructor approval changes only HMS-NF-002's concurrent-user threshold to 100; requirements/HMS-NF-002-approved-change.md is the SRS/STP addendum. All dated 500-user samples and findings remain unchanged. No source-document identifier cleanup, deployment, tag or release action is part of this work.

Reused credible evidence: main 40c513593eff3971f4daa0145ec8ddcb89ba2508 CI run [41976914388](https://github.com/5A-CSE-SE-Team7/hostel-management-system/actions/runs/41976914388) passed backend, frontend/build, combined real MySQL/UI integration, workflow validation and both dependency audits. Its inspected browser job 127077782484 passed all ten branded Chrome/Firefox scenarios, including real application journeys and role-page axe/overflow checks. Frontend tests: 67; live frontend/API integration: four. Runtime/dependency/application source is preserved in this continuation; changed verification tooling is tested separately.

The RTM reconciliation maps every planned TC family to measured scope or an explicit A exception. Missing live TLS, human assistive-technology sign-off, installed daily backups and the real observation month are exceptions, not fabricated passing results. Optional live SMTP is not claimed. See verification/PENDING_EXTERNAL_EVIDENCE.md for the exact evidence checklist. Local scheduled-job simulation would not demonstrate production scheduling, so no fake cron installation is offered as completion.

Current-run results are appended after execution, with immutable source identities, raw reports and limitations. An open evidence/documentation PR does not meet the merged-change closure gate.


### Authentic approved-target load runs

- Managed Node24, application 67b94b539d782508a6c151a14f7367903b08ec31: **FAIL**, 95/100 logins; 4,917/4,917 protected requests, p90 975.63ms. Five login timeouts are preserved; integrity acceptance was not established for this failed workload.
- Official Node22.23.4, application 14f931c99e4c0f8e702bbbc798065d8b09bd26a4: **PASS for this local CI-runtime profile**, 100/100 distinct persisted sessions and 6,562/6,562 protected requests, p90 769.59ms. Exact audit counts matched and all 2,695 hashes/head verified. Cost12, pool20, 300s ramp, 30s sustained and 5000ms timeout remained unchanged. Same host, distinct runtime/network path; no Node-version-only cause or application performance fix is asserted.

Raw samples/audit result are `evidence/scalability-approved-100-*.json`; exact control scripts, source and runtime limits are recorded in `verification/HMS-NF-002.md` and the `evidence/sprint2-followup-20261105/` directory. The application source/schema matches main40c5135. The approved requirement is not a claim that the Node24 failure disappeared or that historical 500-user failures passed.

### Focused backend/postcondition checks

Actual command: `NODE_ENV=test DB_NAME=hms_test node --test --test-concurrency=1 backend/tests/tls.test.js backend/tests/backup-scripts.test.js backend/tests/availability.test.js backend/tests/scalability.test.js`: **8 passed, 0 failed**. This covers real TLS handshakes/HTTP guard, backup failure/archive guards, conservative availability calculations and semantic probes, real-response load assertions, and bcrypt compatibility/cost12. Three new CLI postcondition guard checks also passed (non-load DB, failed workload and changed deadline are rejected with nonzero exit and no evidence output). Logs are in `evidence/sprint2-followup-20261105/`.

Reused restore evidence is `recovery-integration.json`: 2 seconds, all 13 business-table counts equal, 14 original audit hashes retained, restored API valid16-event chain after additional reads. No new scheduled production backup or monthly uptime result is claimed.


### Focused browser and automated guard regressions

Actual local command: `NODE_ENV=test DB_NAME=hms_e2e HMS_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e --prefix frontend -- --project=chrome`: **9 passed, 0 failed (3.0 minutes)** on system Chromium154.0.8037.57. Includes all four new real-session keyboard login/navigation/skip-link/logout tests with visible focus, the genuine registration/complaint/allocation/maintenance journey, and real-page axe/overflow checks at 375/768/1280px. This is automated keyboard coverage, not a human walkthrough or screen-reader sign-off. Prior main CI provides actual branded Chrome/Firefox coverage; the new PR's CI will validate the added tests in those engines.

`node --test backend/tests/load-audit-guards.test.js`: **3 passed, 0 failed** after correcting child CLI test-context inheritance and using the execution permissions required for child processes in this managed environment. The initial scratch harness failure is retained as guard-harness-initial-failed.txt; it is not an application workload failure. The separate real Node24 load failure remains FAIL. Full logs and checksum metadata are in evidence/sprint2-followup-20261105/.


### Initial PR CI and browser traversal correction

PR64 CI run41982225256 passed 111 combined backend tests, 67 frontend tests, four live UI/API integration tests, build/audits/workflow checks. Its expanded browser job passed 14/18 scenarios; the four new Firefox keyboard tests failed reaching the earlier skip link through forward Tab traversal. Existing Chrome and Firefox journeys and axe scans passed. The failure excerpt is retained in evidence/sprint2-followup-20261105/.

The test now uses genuine Shift+Tab to reach controls that precede the current focus, avoiding an assumption that browser-chrome focus wrapping behaves identically. No assertions, keyboard-only steps, timeout or workload controls were removed. Focused local Chromium rerun: **4 passed, 0 failed**. This correction affects only browser tests; the load measurements and application source are unchanged. Fresh remote CI was pending at this follow-up commit; use PR64 latest checks to verify its final Chrome/Firefox result.
