# Scalability remediation — 2026-11-01

The runner creates **500 independent authenticated sessions**, validates real session/profile/complaint/occupancy/fee-dues responses, records errors and latency, and requires zero failed requests. Its workload is an intentionally aggressive continuous-request stress profile with no user think time. Password cost, timeout and success criteria were not relaxed to produce a pass.

Executed on local Node24/MySQL8 with production-cost12 passwords, 180-second login ramp and 30-second sustained phase:

- Before native password work: only 19 distinct sessions authenticated; workload failed. Raw evidence: `scalability-before.json`.
- After native asynchronous bcrypt: **500/500 sessions authenticated**, login p90 **994.96 ms**; **6,870/7,035** protected requests succeeded (**97.65%**). The stress acceptance still **FAILS**. Raw evidence: `scalability-native-before-queue.json`.
- A local audit-write queue was measured and did not improve the stress result (64.5% request success); it was removed with an ordinary revert. Raw evidence: `scalability-queue-trial.json`. Do not infer a fix from the experiment.

Implemented: native asynchronous bcrypt with the same compatible salted hash format and production cost12, backward-compatible bcryptjs verification tests, bounded pool configuration, representative response validation, a large-sample-safe maximum calculation, isolated fixture runner and immutable source metadata. Existing security controls and every critical audit event remain enabled.

Issue27 is **BLOCKED**, not complete: the continuous 500-session workload has request/body timeouts in this environment. Final acceptance needs further profiling/capacity work and an explicit planned-load/deployment definition. A green functional CI suite does not waive this measured failure. No production scalability claim is made.
