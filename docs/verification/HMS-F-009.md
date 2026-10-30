# HMS-F-009 — student complaint submission and tracking

Owner: Aayaan Kamil, PES2UG24CS017. Verified GitHub issue: #16 (assigned Aayaan721). This feature is stacked on HMS-S03, including its verified M1 session adapter correction. Intended PR base: feature/HMS-S03-react-frontend. Review against that base to avoid repeating S03 changes; after S03 merges, retarget to main and rerun combined CI.

Implements real category lookup, student-only creation, identity from server session, default submitted/medium values, optional attachment reference (plain text, no upload), and role-scoped list/detail tracking. Warden/admin may view all; maintenance sees assigned records only. Cross-student/unassigned detail returns 404. Lists use validated bounded keyset pagination. Inputs are parameterized; unsupported/unsafe IDs and invalid filters are rejected.

SAD 4.3 calls the category input `category`, while the existing M3 starter/schema use `categoryId`. Both forms are supported: name is resolved to an active category; when both are provided they must match. No schema change is needed. Missing/unknown/inactive categories return 400. Creation and the real M2 strict audit call share a transaction; audit failure rolls back the complaint.

The broad pre-existing M3 branch (25f6073) was reviewed, not overwritten. Its assignment/resolution/notification functionality is deliberately excluded from this task. The focused implementation improves validation, pagination, audited transaction atomicity and compatibility with the actual S03 client API. Original shared interfaces were taken from the repository's starter design; no credit is claimed for implementing M1 authentication or M2 hashing.

## Reproducible validation

Stage the intended source changes, then run `bash scripts/validate-complaint-integration.sh` from the repository root. It snapshots the Git index into /tmp, installs frozen dependencies, and uses genuine pinned M1/M2 code only in that temporary fixture:
- M1 b14ab0bae2fd06d80cffff6232fd44c8d41b8ee4: auth router and auth middleware.
- M2 17ad39d1de05beef6fc23b511d64cd86635dd9bc: audit implementation.
- S04 e764dd26a93b71f581abf8abcc0feedff7036b86: patched package/lockfile pairs.

The temporary app enables M1's auth mount; repository M1/M2 files are not created or committed. Tests use real MySQL hms_test, bcrypt login, persistent session cookies, scoped SQL and audit hash verification. Never point the destructive test reset at development/production data; the suite enforces DB_NAME=hms_test.

Actual results on 2026-10-29 / Node 24.19.0:
- PASS: 7 complaint database/API tests plus 3 baseline unit tests (10 total) using genuine M1/M2 implementations.
- PASS: 14 frontend tests (10 shell/auth + 4 complaint interactions); production build.
- PASS: both full dependency audits in the S04-compatible fixture, zero vulnerabilities.
- PASS: injected audit failure returned 500 and rolled back creation; the expected error log is intentional fault-injection evidence.
- BLOCKED: feature branch alone requires M1/M2 files and the real auth route mount to be merged for production startup/integration. No fake fallback authorization or audit was added.
- NOT RUN: full browser-to-real-API test and remote CI for this new branch; local API and component checks are distinct from remote CI.

Authentication adapter defect classification A/C: M1 returns a flat user from /api/auth/me. S03 was corrected on its own branch (1b19348); no M1 changes were made.
