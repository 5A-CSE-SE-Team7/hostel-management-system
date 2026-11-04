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
