# HMS-NF-001 — representative authenticated performance verification

Aayaan Kamil / PES2UG24CS017; verified issue #26. Independent main-based measurement tooling; no teammate business logic or schema is changed.

Reproduce: stage intended source, then run `bash scripts/validate-performance.sh`. It snapshots the index into /tmp, composes real pinned M1/M2/M4/F012 implementations there, installs patched S04 dependencies, creates a dedicated hms_perf_PID database and synthetic dataset, runs the actual API, records JSON evidence, then stops only its own server and drops only its own temporary database. It never resets the development database or merges team branches. Required prerequisite commits are pinned in the script.

The original health-only load-test mode is preserved. The new `bash backend/scripts/loadtest.sh --representative BASE_URL OUTPUT.json` mode requires PERF_EMAIL/PERF_PASSWORD through environment bindings; never put production credentials in source or reports. Non-loopback targets require HTTPS. Workload validates JSON shapes/status, authenticates each concurrent session, retains failed/timeout samples, checks expected counts and computes nearest-rank p90 separately per endpoint. No cold-start/login observations are excluded as warmup.

## Actual latest run

Started 2026-10-29T16:43:33.916Z; ended 2026-10-29T16:43:35.708Z. Environment: {'node': 'v24.19.0', 'cpus': 5, 'memoryBytes': 35743760384}. Concurrency 5, 20 iterations per session. One documented synthetic admin account, five independent sessions. Dataset: 10 users, 6 students, 12 beds, 6 allocations, 1000 complaints, 6 fee assessments. NODE_ENV=test disabled access logging; local HTTP and local MySQL 8 were used.

| Operation | Requests | Errors | p90 ms | Result |
| --- | ---: | ---: | ---: | --- |
| login | 5 | 0 | 524.85 | PASS |
| inventory | 100 | 0 | 9.57 | PASS |
| allocations | 100 | 0 | 10.6 | PASS |
| complaint_tracking | 100 | 0 | 9.64 | PASS |
| dashboard_fee_dues | 100 | 0 | 9.43 | PASS |
| occupancy_report | 100 | 0 | 22.62 | PASS |
| complaint_report | 100 | 0 | 26.17 | PASS |

Raw timings: docs/evidence/performance-local.json. PASS: all 605 measured requests succeeded and every workload p90 was <=3000ms. Two automated benchmark tests also pass, covering percentile rank, real cookie propagation and failure classification for unexpected response bodies. This is measured local API performance, not production/browser rendering performance or 500-concurrent-user scalability (HMS-NF-002 belongs elsewhere).

## Query review and limitations

Actual EXPLAIN output and SQL for representative inventory, allocation, complaint and report queries are in docs/evidence/performance-fixture.json. They are representative statement shapes, not a claim to capture every executed statement. Allocation uses primary/foreign-key lookups; inventory uses existing room/bed/allocation indexes, with sort/temporary work; complaint joins use existing category/student keys. Report joins scan the small users table and sort. Estimated EXPLAIN row counts are optimizer estimates; the actual fixture counts are recorded separately. No extra index is justified by this measured workload; do not silently change teammate schema. Reassess date-range report indexes and pagination using real production-scale distributions before a production performance claim.

BLOCKED/NOT RUN: browser paint/navigation timings, network/TLS overhead, sustained production workload, representative deployment sizing and production database distributions. A local p90 PASS is not proof all SRS performance acceptance criteria are satisfied. Full-month availability is tracked separately by NF003. Remote CI on the standalone main-based branch still depends on S03/M1/M2/S04 integration; benchmark API composition is isolated validation evidence, not a hidden merge.
