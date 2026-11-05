# Approved 100-session verification — 2026-11-05

Current scope: [SRS/STP addendum](../requirements/HMS-NF-002-approved-change.md), as supplied by the operator's report of official instructor approval. **PASS for the declared local Node22 CI-runtime profile; FAIL on managed Node24.** This is a measured environment distinction, not an application performance fix or an unconditional deployment-capacity claim. Required documentation/test changes still need review and merge before issue closure.

| Actual run | Distinct authenticated sessions | Protected successful / attempted | Protected p90 / max | Result |
|---|---:|---:|---:|---|
| Managed Node24.19.0, source 67b94b5 | 95/100 | 4,917/4,917 | 975.63 / 2,178.72 ms | FAIL: five login timeouts |
| Official Node22.23.4, source 14f931c | 100/100 | 6,562/6,562 | 769.59 / 1,284.03 ms | PASS for this local supported-runtime profile |

Node22 login p90/max: 589.78/1,132.64 ms. Node24 login p90/max: 2,240.65/22,728.51 ms; the long observed wall time does not mean the configured 5,000ms deadline was increased. No request failure was ignored. The same physical host reports three logical CPUs but has a two-CPU cgroup quota and 8 GiB limit. The Docker control additionally used explicit two-CPU/8 GiB limits and a bridge to the same real MySQL8 container. Runtime and database network path differ, so this is not proof of a Node-version-only cause. The remaining Node24 authentication limitation is unresolved and must be considered in deployment/runtime acceptance.

Both actual runs retained 100 virtual users, production-cost12 synthetic password, pool20, 300-second preparation, 30-second sustained traffic, 5000ms timeout, default native worker configuration and real response assertions. The original workload module is byte-identical to main (SHA256 `2cccdf3e90e474b8b931cfb425e7a3e3943e794ceb84060153b3df1d33fdcfa9`). Each login has an independent session; all share one synthetic admin account. This does not measure 100 diverse records or production user behavior. NODE_ENV=test is limited to isolated disposable fixtures, preserving the original test-rate-limiter setup; never expose it as production.

The untimed Node22 postcondition verified **100 persisted sessions**, actual stored password cost **12**, pool **20**, exactly **100 LOGIN + 1,306 COMPLAINT_RECORD_VIEW + 1,289 FEE_DUES_VIEW events**, and a valid **2,695-row hash chain/head**. No audit batching or password-concurrency experiment was introduced into the application. The new verifier also rejects non-load databases, failed workloads and changed deadlines; all three negative guard checks passed. Its read-only checks occur after timed traffic and cannot make a failed workload pass.

Raw evidence: `../evidence/scalability-approved-100-node24-failed.json`, `../evidence/scalability-approved-100-node22.json`, `../evidence/scalability-approved-100-node22-audit.json`. Exact local control scripts/logs and metadata are under `../evidence/sprint2-followup-20261105/`. The pinned image is `node@sha256:4b150b48b4116e2a22f2c39cc27025fbf4f153e2078fd3b14d159fdb5c7279da`; repository CI uses major22. Both measured application trees have identical backend/frontend application source and schema to main40c5135; only verification/docs differ. Review this declared runtime/host scope rather than inferring universal capacity.

The approved fixture is `bash scripts/validate-scalability.sh`; it writes a new approved-target report instead of overwriting historical evidence. The archived Docker scripts include exact local paths; adapt only fixture/mount paths when reproducing, retaining workload settings and image identity.

---

## Historical 500-user evidence — unchanged

> **Current integration audit: FAIL / BLOCKED.** On cumulative application `8982493ffbb42d343308d85af2a24c826d05d532`, the default configuration authenticated 490/500 sessions and passed 4,712/4,861 protected requests (149 failures; p90 4,636.31 ms). A controlled `UV_THREADPOOL_SIZE=2` replay authenticated 410/500 sessions and achieved 56.61% protected-request success; it was worse and is not recommended. Both runs retained 500 requested sessions, production-cost-12 passwords, pool 20, 300-second preparation, 30-second sustained phase, and a 5,000 ms timeout. No assertion or security control was relaxed. The host exposes three logical CPUs but has a two-CPU cgroup quota. Timeouts were observed; a specific server-side bottleneck is not proven. Profile/retest on an isolated representative host and remediate before claiming #27 complete. Raw failures and experiment settings are in `docs/evidence/scalability-integration-*-failed.json` and `scalability-integration-runtime.json`. Earlier PASS results below are historical and do not establish current readiness.

# Final isolated 500-session acceptance — 2026-11-01

**PASS for the declared local profile:** 500/500 distinct sessions authenticated; **9,136/9,136 protected requests succeeded**, zero errors; request p90 **2737.07 ms**. Authentication preparation used a **300-second ramp**, followed by **30 seconds of continuous concurrent requests** with no think time. Passwords used production bcrypt cost12; request timeout remained 5000 ms. Source identity, exact timing and environment are recorded in `scalability-local.json`.

The final application keeps the baseline pool limit20 configurable rather than inflating it to100 and uses native asynchronous, hash-compatible bcrypt. The unsuccessful standalone audit queue was reverted; no audit event or security check was disabled. This verifies the stated synthetic single-account/500-session local profile, not production sizing or 500 diverse user records. Production load/host acceptance remains separate.

The earlier bounded-pool run shared local resources with other verification and authenticated 481/500 sessions; all 9,950 workload requests then passed, but the overall run correctly failed. It is retained as `scalability-bounded-before-isolation.json`. Earlier failures below remain part of the evidence and are not replaced by the passing replay.

# Scalability remediation — 2026-11-01

The runner creates **500 independent authenticated sessions**, validates real session/profile/complaint/occupancy/fee-dues responses, records errors and latency, and requires zero failed requests. Its workload is an intentionally aggressive continuous-request stress profile with no user think time. Password cost, timeout and success criteria were not relaxed to produce a pass.

Executed on local Node24/MySQL8 with production-cost12 passwords, 180-second login ramp and 30-second sustained phase:

- Before native password work: only 19 distinct sessions authenticated; workload failed. Raw evidence: `scalability-before.json`.
- After native asynchronous bcrypt: **500/500 sessions authenticated**, login p90 **994.96 ms**; **6,870/7,035** protected requests succeeded (**97.65%**). The stress acceptance still **FAILS**. Raw evidence: `scalability-native-before-queue.json`.
- A local audit-write queue was measured and did not improve the stress result (64.5% request success); it was removed with an ordinary revert. Raw evidence: `scalability-queue-trial.json`. Do not infer a fix from the experiment.

Implemented: native asynchronous bcrypt with the same compatible salted hash format and production cost12, backward-compatible bcryptjs verification tests, bounded pool configuration, representative response validation, a large-sample-safe maximum calculation, isolated fixture runner and immutable source metadata. Existing security controls and every critical audit event remain enabled.

Historical pre-final status (superseded by the isolated result above): the continuous 500-session workload has request/body timeouts in this environment. Final acceptance needs further profiling/capacity work and an explicit planned-load/deployment definition. A green functional CI suite does not waive this measured failure. No production scalability claim is made.
