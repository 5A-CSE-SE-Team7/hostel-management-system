# HMS-NF-002 / TC-Perf-02 approved requirement addendum

Effective for the current Sprint 2 acceptance scope, 2026-11-05. Applies to SRS HMS-NF-002 and the Software Test Plan's scalability case TC-Perf-02 / section 14. This focused addendum supersedes only the concurrent-session threshold in the original submitted documents and archived backlog; it does not rewrite historical test results.

**Approved target: 100 concurrent authenticated users.** The repository operator explicitly reported official instructor approval in the 2026-11-05 task instructions and repeated it in the completion instruction. That supplied approval is the authority used here; no signed instructor artifact or independent approval conversation was available or invented. GitHub issue #27 records the same provenance.

Reason: the team requested a revised supported acceptance scope following reproducible 500-session failures in the constrained test environment. Those failures do not prove infrastructure alone caused every timeout. Impact: the approved test requires 100 independently persisted authenticated sessions, rather than 500; it makes no 500-user capacity claim and does not excuse any failed request at the approved load.

As in the original workload, the fixture uses one synthetic admin/warden account with 100 separately authenticated, independently persisted sessions. It does not measure 100 diverse user records.

The revised test must retain:

- Production bcrypt cost 12 for the synthetic load account; compatible authentication, RBAC and session behavior.
- Shared MySQL query/session pool limit 20, default native worker configuration, a 300-second login preparation ramp and 30 seconds of continuous concurrent protected requests.
- A 5,000 ms request timeout and the existing real response assertions on session, profile, complaint, occupancy and fee-dues APIs.
- 100/100 successful distinct sessions, zero failed protected requests, exact persisted audit event counts and a valid complete hash chain/head.
- Real isolated MySQL/HTTP execution with source identity, environment, configuration and raw failure/latency samples. A failed run remains failed; functional CI alone does not establish scalability.

`bash scripts/validate-scalability.sh` runs this approved fixture and an untimed read-only persistence/integrity check. It writes a new `scalability-approved-100.json` and companion audit report. It never overwrites `scalability-local.json` or any historical 500-user artifact. The original load-test module remains available for explicit 500-user investigations; no historical sample is deleted or relabeled.

Execution results and limitations belong in `../verification/HMS-NF-002.md`, `../TEST_EXECUTION.md` and `../RTM.md`. Local evidence is not certification of production sizing. Requirement approval, test success, reviewed documentation merge and issue closure are separate events.
