# HMS-S04 verification and checkpoint

Date: 2026-10-29. Author: Aayaan Kamil, PES2UG24CS017. Issue #4 independently verified on GitHub. Main base: 3fc386a14454f296eb6ba7af94bef979425fc86b. No PR #40 edits, merges, auth/audit implementation or fee-backend changes.

## Security remediation

- Backend Nodemailer 6.10.1 → 10.3.1: resolves the reported high-severity DoS, SSRF/file-access and TLS-validation advisories, plus other audited findings. This is a major upgrade; message compilation was tested without external delivery. Real SMTP integration remains for the notification task.
- express-mysql-session remains 3.0.3. Its pinned vulnerable mysql2 3.10.2 is replaced by a narrowly scoped override to ^3.24.6, resolved to 3.24.6. Top-level mysql2 and session-store driver deduplicate. Real MySQL session-store operations were tested; no authentication or audit module was implemented.
- Frontend Vite 5.4.21 → 8.3.5, plugin-react → 6.1.2, React Router DOM → 7.18.5. S03's vulnerable Vitest 2.1.9 dependency family is superseded by Vitest 5.0.5 (including removal/replacement of vulnerable transitive dependencies). Compatible Testing Library/jsdom dependencies support S03 tests.
- Both full dependency graphs report zero vulnerabilities after frozen npm ci. No --force audit repair, TLS bypass, development-dependency exclusion or raised vulnerability threshold was used.

## Executed checks

| Check | Outcome | Evidence / limit |
| --- | --- | --- |
| backend npm ci; npm audit --audit-level=high | PASS | Zero vulnerabilities; session-store mysql2 resolves to patched 3.24.6 |
| frontend npm ci; npm audit --audit-level=high | PASS | Zero vulnerabilities |
| bash scripts/ci/lint-workflows.sh | PASS | actionlint 1.7.7; upstream archive SHA-256 verified |
| node --test tests/ci/*.test.mjs | PASS | 11 tests, also executed with Node 22.23.4; accepted/rejected PR references, Project preflight, privileged workflow guard, runner no-suite/failure propagation |
| DB_NAME=hms_test npm run db:init (backend) | PASS | Real MySQL 8 test schema |
| DB_NAME=hms_test node ../scripts/ci/dependency-smoke.cjs (backend) | PASS | Node 22; actual session write/read/touch/delete, Nodemailer stream compilation; no SMTP service |
| Development db:init and db:seed | PASS | Existing scripts still function after backend upgrade |
| S03 source + S04 dependency set in temporary compatibility directory | PASS | Node 22 and Node 24: all 9 frontend tests and production build; original S03 source from commit 6c33fd7, no source copied into S04 branch |
| Backend unit suite on S04 main-based branch | FAIL / integration BLOCKED | Actual MODULE_NOT_FOUND for utils/audit.js; middleware/auth.js is also absent; teammate-owned dependencies |
| Backend integration runner on this branch | BLOCKED (nonzero) | No module integration suite present; no zero-test success |
| Frontend tests/build on this branch alone | BLOCKED (nonzero) | S03 source/test/config unmerged; no test files and missing /src/main.jsx respectively |
| GitHub Project run/board membership | BLOCKED | ADD_TO_PROJECT_PAT unavailable in observed PR #40 run; owner configuration and merged workflow needed |
| Branch protection verification | BLOCKED | GitHub API returned Forbidden; owner must verify required checks |
| New GitHub Actions execution for this change | NOT RUN | Needs real PR or workflow merged into main; local validation does not establish remote success |

Node subprocess tests require the managed executor's normal process permissions; the restricted command sandbox prevented child test output. The same tests passed using normal execution permissions and Node 22/24. No test assertions were removed to address this environment restriction.

## Acceptance / traceability

HMS-S04 / Assignment 2b: workflow implementation and local validation complete, acceptance pending. The requirements “failing tests cannot be merged” and “new issues appear on Project automatically” remain BLOCKED until owner settings and a successful real Project workflow/board observation are verified. Issue #4 should remain open; use Refs #4 rather than claiming full closure.

Progress: S03 implementation pushed (draft PR #40, live M1 integration pending); S04 implementation prepared for separate review, external acceptance pending; HMS-F-009/F-010/F-011/F-012/SR-001/F-013U/NF-001/NF-003 not implemented by this checkpoint. Stop here for review before complaint work.

## PR #41 action resolution correction

The initial CI workflow accidentally assigned setup-node's v6 SHA to checkout and checkout's v6 SHA to setup-node. This prevented all five CI jobs from starting. Corrected all eight references, retaining immutable pins and existing permissions/checks:
- actions/checkout v6: d23441a48e516b6c34aea4fa41551a30e30af803
- actions/setup-node v6: 249970729cb0ef3589644e2896645e5dc5ba9c38
- actions/add-to-project v1.0.2 remains 244f685bbc3b7adfa8466e08b698b5577571133e

Each repository/tag was independently resolved with git ls-remote, and its action.yml was successfully retrieved at the corresponding SHA from raw.githubusercontent.com. A regression test checks repository-to-revision association for every uses reference across the modified workflows. Local actionlint and the expanded 12-test CI utility suite pass. Remote rerun results must be assessed separately; this correction does not resolve unmerged application dependencies or Project credentials.
