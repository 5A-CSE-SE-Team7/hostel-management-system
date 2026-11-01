# HMS requirements traceability — 2026-11-01

This execution companion supplements the unchanged submitted SRS/SAD RTMs. P below means the stated automated scope passed; it does not certify manual or deployment acceptance. Evidence follows the feature's owning PR and `docs/verification/`. N means acceptance remains unverified. The upstream SRS identifies 16 FRs, five NFRs and five security requirements; issue22 is the frontend slice of F-013.

| Requirement | Cases | Evidence / scope | Outcome |
|---|---|---|---|
| F-001..004 | TC-Auth-01..04 | backend auth/shared contracts; account frontend tests | P, automated |
| F-005 | TC-Room-01 | inventory API persistence/deactivation and navigation | P, automated |
| F-006 | TC-Room-02 | allocation concurrency, eligibility, audit and notification | P, automated |
| F-007 | TC-Room-03 | PR61 allocations + real-session transfer/rollback tests | P, automated |
| F-008 | TC-Room-04 | PR62 check-in/out/history + real-session concurrency | P, automated |
| F-009..010 | TC-Comp-01..02 | complaint submission/assignment API and frontend tests | P, automated |
| F-011 | TC-Comp-03 | PR45 locked transitions, ownership, resolution details | P, automated |
| F-012 | TC-Comp-04 | PR46 notification persistence/retries/isolation/rollback | P, adapter scope; live SMTP N |
| F-013 | TC-Admin-01 | fee-contract API tests; PR48 frontend | P, automated |
| F-014..015 | TC-Admin-02..03 | Sprint1 API and live frontend service tests | P, automated |
| F-016 | TC-Admin-04 | PR51 six report types, period boundaries, CSV injection and roles | P, automated |
| NF-001 | TC-Perf-01 | PR49 actual-tree local benchmark | Local evidence only; deployed/browser N |
| NF-002 | TC-Perf-02 | PR59 500-session runner and retained measured results | See latest evidence; production N |
| NF-003 | TC-Rel-01 | PR50 semantic probes, unknown coverage, maintenance exclusions | Monitor tests only; monthly target N |
| NF-004 | TC-Rel-02 | PR60 isolated timed restore and real API chain verification | Local fixture only; daily deployed schedule N |
| NF-005 | TC-UX-01 | PR58 automated real-page axe/responsiveness, 375/768/1280 px | Manual screen-reader and full AA acceptance N |
| SR-001 | TC-Sec-01 | PR47 actual TLS handshakes and HTTP/proxy guard | Local protocol P; deployed certificate/domain N |
| SR-002 | TC-Sec-02 | salted bcrypt compatibility and production cost policy | P, automated |
| SR-003 | TC-Sec-03 | PR58 complete protected-route inventory/denied-role sessions | See PR58 evidence; manual acceptance separate |
| SR-004 | TC-Sec-04 | PR57 cross-student isolation; fail-closed critical-read audit | See PR57 evidence |
| SR-005 | TC-Sec-05 | chain tamper/head checks and transaction audit coverage | P, automated |

No production uptime, manual audit, video, v1.0 release or development freeze is asserted. See TEST_EXECUTION.md for execution boundaries and open acceptance items.
