# Sprint 2 test execution and residual acceptance

2026-11-01: all results below use synthetic data. This document records verified scope and explicit exceptions; it does not close issues34/36/38.

At PR51's corrected application scope: **92 backend tests, 67 frontend tests and the production build passed** on Node24/MySQL8. The added report regression covers check-out of an allocation created before the selected month, historical end-date occupancy, six report APIs/CSV, invalid dates and denied student/maintenance roles. Notification storage failure was separately exercised through real SQL and rolled back the complaint transition/audit together.

Broader verification is owned by the later dependent PRs: PR57 adds audited sensitive-read failure handling; PR58 adds a complete protected-route matrix and real browser registration -> complaint -> allocation -> maintenance-resolution journey plus responsive axe scans. PR49/59 retain raw local performance/scalability records, including failures; PR60 records a two-second isolated recovery with genuine API audit verification. Exact source identities and scope limits accompany these records.

Exceptions: Firefox could not be downloaded locally because the environment blocks the download domains; inspect the actual GitHub browser job. A manual screen-reader walkthrough, production-domain TLS capture, production-sized performance/recovery, deployed daily backup scheduling and a completed month of independent uptime observations remain unverified. The supplied generic ATM STP is not represented as an executed HMS suite; TEST_PLAN.md defines the documented HMS execution scope.

Issues36 and38 remain incomplete: no two-minute final video, v1.0 tag, sprint closure or development freeze was performed. Issue34 requires reviewer reconciliation of all evidence/exceptions with the submitted RTM before sign-off. Historical files saying “main unchanged” refer to earlier snapshots and must not override current GitHub state. No PR merge or approval is authorized by these results.
