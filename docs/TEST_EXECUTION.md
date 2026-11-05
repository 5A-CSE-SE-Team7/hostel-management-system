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
