# HMS-NF-001 — current integrated performance evidence

Aayaan Kamil / PES2UG24CS017; existing PR49 / issue26. This supersedes the earlier local snapshot without upgrading it to production evidence.

The runner now composes committed real M1/M2/M4/complaint/TLS/monitoring sources via CI snapshot 86a570c07b814c0ff54d3ce0efad589ae13368aa. It applies no STAFF/calendar proposals and preserves the production p90 threshold of 3000ms. It creates only a disposable hms_perf_PID database, refuses other names in the fixture preparer, stops its temporary server and drops its database on exit. It uses the already-running local Docker MySQL service and never modifies main or production data.

The synthetic fixture deliberately upgrades its seed password hashes from baseline cost10 to the actual M1 production cost12 before measuring login. This prevents the old seed hash strength understating authentication cost. Test-server mode increases rate-limit allowance for a controlled benchmark; no production rate limits were changed.

Actual run: 2026-10-30T09:42:52.717Z through 2026-10-30T09:42:56.425Z; Node v22.23.4; 5 visible CPUs; MySQL 8.0.46; 5 concurrent authenticated admin sessions, 20 iterations/session, 605 measured requests, zero errors, no warmup samples excluded. Fixture: 10 synthetic users, 6 students, 12 beds, 6 allocations, 1000 complaints and 6 fee assessments. Browser rendering/TLS/network deployment latency is not measured.

| Operation | Requests | Errors | p90 ms | Result |
| --- | ---: | ---: | ---: | --- |
| login | 5 | 0 | 1994.91 | PASS |
| inventory | 100 | 0 | 12.72 | PASS |
| allocations | 100 | 0 | 12.32 | PASS |
| complaint_tracking | 100 | 0 | 13.13 | PASS |
| dashboard_fee_dues | 100 | 0 | 12.31 | PASS |
| occupancy_report | 100 | 0 | 30.67 | PASS |
| complaint_report | 100 | 0 | 32.5 | PASS |

All measured endpoints pass p90<=3000ms under this declared local load. Raw individual samples/environment are in docs/evidence/performance-local.json; counts and actual EXPLAIN SQL/plans are in performance-fixture.json. Existing indexes support the measured workload; no unsubstantiated schema/index changes were introduced. Two benchmark regression tests pass.

Reproduce after fetching referenced existing branches: `npm exec --yes --package=node@22 -- bash scripts/validate-performance.sh`. Docker MySQL must already be running. Optional HMS_MONITOR_EVIDENCE_DIR captures a real healthy probe and an intentionally stopped-fixture probe; those observations are synthetic monitor validation, not production downtime evidence.

PASS: this representative local API benchmark. BLOCKED/NOT TESTED: production/browser performance, sustained production-sized distributions and actual deployment sizing. No 500-user scalability or production performance claim is made. Standalone main-based application CI still needs genuine frontend/auth/audit prerequisites; required failures are retained.
