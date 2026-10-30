Title: test(HMS-NF-001): benchmark authenticated representative HMS endpoints
Head: feature/HMS-NF-001-performance
Base: main
Refs #26

Adds reproducible authenticated login/inventory/allocation/complaint/fee-dues/report workloads, expected-count and response validation, p90/failure reporting, synthetic isolated database setup and EXPLAIN evidence. Preserves the original health-only load-test mode.

PASS: 605 measured requests, zero errors, all operation p90 values below 3000ms on the documented local fixture; two benchmark tests. Raw timings, exact environment/dataset limits and query plans are committed. Browser/production performance and 500-user scalability are NOT claimed. See docs/verification/HMS-NF-001.md. Keep draft for integration/deployment evidence review; reviewer aadi-basal-06.
