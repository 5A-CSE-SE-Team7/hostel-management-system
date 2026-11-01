# Pending genuine PR submissions

All eight branches are pushed. Each gh pr create call failed with Forbidden. None of the following entries is a PR URL or a completion claim. Keep draft; aadi-basal-06 review is required but not requested through a successful API call. Stacked bases avoid copying prerequisite changes into multiple diffs. After prerequisites merge, retarget and rerun combined CI.

## HMS-F-009

Verified pushed commit: `a37dd522d9876b85f2162a0be87a3b7dbcd1233c`

Title: feat(HMS-F-009): audited student complaint submission and scoped tracking
Head: feature/HMS-F-009-complaint-submission
Base: feature/HMS-S03-react-frontend (stacked; retarget after #40 merges)
Issue: Refs #16
Draft: yes, pending main integration and CI

Implements complaint submission, active categories, field validation, authenticated actor ownership, atomic real-M2 audit integration and scoped tracking with bounded keyset pagination. The React page includes accessible fields, loading/empty/error/retry states, tracking and older-page navigation.

Validation: 10 real backend tests (7 complaint + 3 baseline), 14 frontend tests, production build and zero-vulnerability audits in an isolated compatibility fixture using pinned real M1/M2 code and S04 dependencies. Missing upstream modules are not stubbed. See docs/verification/HMS-F-009.md for exact reproducible steps and limits.

Depends on #40 source plus M1/M2 integration; main remains unchanged. Existing M3 starter branch is preserved. Assignment, resolution and notifications belong to separate task branches. Request review from aadi-basal-06; do not self-approve or merge.

## HMS-F-010

Verified pushed commit: `e22a33b2f890cc722881f46a85b38fe638423757`

Title: feat(HMS-F-010): serialized complaint assignment and priority controls
Head: feature/HMS-F-010-complaint-assignment
Base: feature/HMS-F-009-complaint-submission
Refs #17

Adds real role-restricted assignment, active maintenance directory, independent priority updates, transactional auditing and accessible staff controls. Resolved assignments fail; reassignment preserves progress. See docs/verification/HMS-F-010.md.

PASS in the genuine M1/M2/MySQL compatibility fixture: 14 backend tests, 16 frontend tests, build and both zero-finding audits. Standalone upstream integration remains pending. Keep draft; review aadi-basal-06. No merges or teammate branch edits.

## HMS-F-011

Verified pushed commit: `daeb31718f5911a44af0c90852b06cb88e45e7a2`

Title: feat(HMS-F-011): locked maintenance progress and resolution workflow
Head: feature/HMS-F-011-maintenance-resolution
Base: feature/HMS-F-010-complaint-assignment
Refs #18

Implements strict assigned/in-progress/resolved transitions, assigned-maintenance dashboard, mandatory resolution details and transactional auditing. Concurrent resolutions yield one success and one conflict. PASS: 17 genuine backend tests, 18 frontend tests, build and both clean audits in the reproducible M1/M2 fixture. See docs/verification/HMS-F-011.md. Keep draft pending upstream integration; reviewer aadi-basal-06. No teammate branches changed.

## HMS-F-012

Verified pushed commit: `3101366098b903b7f88d1626a16262c489522e74`

Title: feat(HMS-F-012): durable complaint notifications and optional mail retries
Head: feature/HMS-F-012-complaint-notifications
Base: feature/HMS-F-011-maintenance-resolution
Refs #19

Persists lifecycle notifications transactionally, delivers optional TLS-protected email after commit with three retries, and provides scoped list/read/read-all/count endpoints, unread navigation badge and notification UI. Includes a recovery worker and per-notification MySQL delivery lock.

PASS: 21 real backend tests, 21 frontend tests, production build, both clean audits in the documented M1/M2/S04 compatibility fixture. Optional SMTP failure/retry uses an explicit transport double; no external delivery or production deployment is claimed. See docs/verification/HMS-F-012.md. Keep draft for integration review by aadi-basal-06.

## HMS-SR-001

Verified pushed commit: `105ad79ffae2aa9447ef3297adf5545f8779af63`

Title: fix(HMS-SR-001): enforce production HTTPS and verify TLS handshakes
Head: feature/HMS-SR-001-https-tls
Base: main
Refs #20

Enforces HTTPS for production health/API traffic, disables implicit proxy trust, defaults API binding to loopback and validates paired TLS key/certificate configuration. Preserves HSTS, Secure cookies and minimum TLS 1.2. Documents the explicit trusted-proxy deployment contract.

PASS: two real child-server tests: HTTP and spoofed protocol rejected, TLS 1.2/1.3 accepted with certificate verification, TLS 1.0/1.1 refused with protocol-version alerts, HSTS checked. Deployment/public-domain checks are NOT RUN; no production claim. Evidence: docs/verification/HMS-SR-001.md. Keep draft pending review and combined integration. Reviewer: aadi-basal-06.

## HMS-F-013U

Verified pushed commit: `71ed9c3d11c6b909ba2da55109ebe5baa8062ac0`

Title: feat(HMS-F-013U): student and warden fee ledger interfaces
Head: feature/HMS-F-013U-fee-frontend
Base: feature/HMS-S03-react-frontend
Refs #22

Adds student ledger/totals and staff dues, searchable student picker, assessment/payment forms, two-decimal display and field-level errors. Handles loading/empty/error/retry states and stale student-ledger requests. Uses verified M4 API; does not implement or modify fee backend.

PASS: 15 frontend tests and build, real M1/M2/M4 MySQL fee API contract test, both clean audits in the documented fixture. Ownership review by aadi-basal-06 is required because the original M4 branch also contains Fees.jsx. Keep draft pending coordination and upstream integration. Evidence: docs/verification/HMS-F-013U.md.

## HMS-NF-001

Verified pushed commit: `84d21988690ec3133c805e684a81f1af9be39bcf`

Title: test(HMS-NF-001): benchmark authenticated representative HMS endpoints
Head: feature/HMS-NF-001-performance
Base: main
Refs #26

Adds reproducible authenticated login/inventory/allocation/complaint/fee-dues/report workloads, expected-count and response validation, p90/failure reporting, synthetic isolated database setup and EXPLAIN evidence. Preserves the original health-only load-test mode.

PASS: 605 measured requests, zero errors, all operation p90 values below 3000ms on the documented local fixture; two benchmark tests. Raw timings, exact environment/dataset limits and query plans are committed. Browser/production performance and 500-user scalability are NOT claimed. See docs/verification/HMS-NF-001.md. Keep draft for integration/deployment evidence review; reviewer aadi-basal-06.

## HMS-NF-003

Verified pushed commit: `116a439be1a3bbaabf1c0897e1ecfa2988033792`

Title: feat(HMS-NF-003): sampled availability monitor and coverage reporting
Head: feature/HMS-NF-003-availability
Base: main
Refs #28

Adds semantic health monitoring, persistent JSONL observations, conservative availability/coverage reports, maintenance exclusions, systemd scheduling configuration and operational policy. PASS: 3 tests and one real local health observation; evidence explicitly reports incomplete monthly coverage and monthlyTargetVerified=false. No month-long availability or deployed monitoring claim. See docs/verification/HMS-NF-003.md. Keep draft pending deployment/observation acceptance; reviewer aadi-basal-06.

