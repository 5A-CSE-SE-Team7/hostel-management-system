# HMS-NF-002 / TC-Perf-02 approved requirement addendum

Effective for the current Sprint 2 acceptance scope, 2026-11-05. Applies to SRS HMS-NF-002 and the Software Test Plan's scalability case TC-Perf-02 / section 14. This addendum defines the sole current concurrency acceptance threshold for the submitted SRS and test plan. Archived test records are not modified.

**Approved target: 100 concurrent authenticated users.** The repository operator explicitly reported official instructor approval in the 2026-11-05 task instructions and repeated it in the completion instruction. That supplied approval is the authority used here; no signed instructor artifact or independent approval conversation was available or invented. GitHub issue #27 records the same provenance.

Reason: the instructor-approved local academic evaluation uses a 100-user authenticated concurrency threshold. Impact: the test requires 100 independently persisted authenticated sessions, with zero failed protected requests and audit integrity; no higher concurrency guarantee is asserted.

As in the original workload, the fixture uses one synthetic admin/warden account with 100 separately authenticated, independently persisted sessions. It does not measure 100 diverse user records.

The revised test must retain:

- Production bcrypt cost 12 for the synthetic load account; compatible authentication, RBAC and session behavior.
- Shared MySQL query/session pool limit 20, default native worker configuration, a 300-second login preparation ramp and 30 seconds of continuous concurrent protected requests.
- A 5,000 ms request timeout and the existing real response assertions on session, profile, complaint, occupancy and fee-dues APIs.
- 100/100 successful distinct sessions, zero failed protected requests, exact persisted audit event counts and a valid complete hash chain/head.
- Real isolated MySQL/HTTP execution with source identity, environment, configuration and raw failure/latency samples. A failed run remains failed; functional CI alone does not establish scalability.

`bash scripts/validate-scalability.sh` runs this approved fixture and an untimed read-only persistence/integrity check. It writes a new `scalability-approved-100.json` and companion audit report. It does not overwrite older test artifacts. Historical samples remain authentic records rather than current acceptance requirements.

Execution results and limitations belong in `../verification/HMS-NF-002.md`, `../TEST_EXECUTION.md` and `../RTM.md`. Local evidence is not certification of production sizing. Requirement approval, test success, reviewed documentation merge and issue closure are separate events.
