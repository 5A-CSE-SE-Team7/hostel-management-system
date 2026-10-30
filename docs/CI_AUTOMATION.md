# HMS-S04 — CI and GitHub automation

Owner: Aayaan Kamil (PES2UG24CS017). Verified issue: https://github.com/5A-CSE-SE-Team7/hostel-management-system/issues/4.

## Checks and review policy

CI runs on all pull requests (including stacked feature-base PRs), pushes to main and manual dispatch. Use Node 22 (currently 22.23.4; frontend tools require >=22.12). Dependencies install from frozen npm lockfiles. Backend checks use MySQL 8 and the isolated hms_test database. Unit tests and the integration runner report independently after installation; no test failure is ignored. The integration runner executes all tests/*.test.js except unit.test.js, and fails if no integration suite exists. It does not report a unit-only run as integration coverage. Schema initialization and dependency smoke checks precede the suites.

Frontend runs npm test and npm run build independently after installation, so a failing test does not hide build diagnostics. A no-test run fails. Workflow validation uses checksum-pinned actionlint 1.7.7 plus executable validator/runner regression tests. Official checkout/setup-node actions are pinned to verified v6 commit SHAs, with read-only contents permission and no retained checkout credentials.

Backend and frontend dependency audits run in separate matrix jobs, with fail-fast disabled and npm audit --audit-level=high. As explicitly required by issue #4, audits remain advisory (job-level continue-on-error, as in the original workflow). Each underlying audit still returns nonzero for high/critical findings; neither graph masks the other. Required backend/frontend checks remain blocking. Making audits mandatory would be a separate policy decision; this change does not lower their threshold, exclude development packages or suppress findings.

PR checks preserve the existing numeric issue-reference validator. Refs #4 is appropriate while this task awaits external acceptance evidence. Refs #3/Closes #3 continue to be accepted. PR bodies are passed as environment data, never interpolated into shell source.

## Project automation: owner configuration required

1. Select/create the intended organization or user GitHub Project. Its URL must be https://github.com/orgs/OWNER/projects/NUMBER or https://github.com/users/OWNER/projects/NUMBER.
2. Repository Settings → Secrets and variables → Actions → Variables: add PROJECT_URL with that URL.
3. Under the account that has write access to the Project, create a credential authorized for that Project. For this existing actions/add-to-project PAT integration, a classic PAT needs project scope and repo scope for private repositories (public_repo for public-only repository access). Authorize organization SSO if required. A Project owner must also grant that account Project write access. Do not assume GITHUB_TOKEN has organization/user Project access.
4. Repository Settings → Secrets and variables → Actions → Secrets: store the value as ADD_TO_PROJECT_PAT. If using an organization Actions secret, grant this repository access. Do not store it only as an environment secret: this job does not select an environment. Do not paste the value into an issue, PR or source file. Set expiration and rotate it under the owner's policy.
5. After this workflow is merged into main, open a real issue/PR and inspect its Project automation run and actual board item. Existing issue/PR events are not replayed by adding credentials. Use Actions → Project automation → Run workflow with content_url to retry a selected existing item (e.g. issue #4); no dummy issue is needed. The manual path validates that the item belongs to this repository. Confirm the run succeeds and the item exists in the intended board.

Missing URL/token now fails early with an actionable message; it is not silently skipped or represented as success. Automatic PR handling uses pull_request_target solely for metadata with a fixed, pinned action. It never checks out or executes PR content; workflow GITHUB_TOKEN permissions are empty. Never add checkout, npm scripts or commands derived from PR title/body to this privileged workflow. Issue events run the workflow from the default branch. Changes to this workflow therefore need main review/merge before production event validation. The pinned add-to-project action still uses the older action runtime and may emit a Node deprecation warning; this is distinct from token availability.

## Required repository-owner protection settings

Settings → Rules → Rulesets (or Branches → branch protection) → rule targeting main:
- Require pull requests and at least one approving review; retain code-owner review and any existing stricter settings.
- Require status checks: **Backend unit + integration tests**, **Frontend build**, and **PR must reference a backlog issue**; add **Workflow validation** after its first run registers it.
- Require branches up to date if that is the team's existing policy. Restrict bypass permissions according to the existing policy; do not add a bypass for this task.
- Preserve any other required checks. Do not mark a missing/failed teammate test green or remove it to permit merging.

API access to inspect protection returned Forbidden; no settings have been changed or asserted active. A failure cannot be guaranteed to prevent merging until the owner verifies the rule and its coverage. A successful build or local test alone is not acceptance evidence for branch protection or Project membership.

## Dependencies and review order

This branch starts from main at 3fc386a, not the S03 feature branch. It intentionally does not duplicate S03 source files. Review S03 PR #40 and coordinate overlapping frontend package/lockfile changes: retain S03 source/config/tests and the patched S04 dependency versions/test command, then regenerate and review the lockfile and rerun both suites. Do not resolve the overlap by restoring the vulnerable tool versions.

Main currently has neither frontend/src nor frontend test files. Its backend lacks utils/audit.js (Abhishek), middleware/auth.js (Aditya), and module integration suites. Those checks remain nonzero until real implementations are integrated. Teammate branches exist remotely but have not been merged, copied, rewritten or claimed as verified by this task. PR #39 also proposes frontend skeleton work; coordinate its scope with PR #40 to avoid competing frontend entries.

References: HMS SRS v1.0 security/accessibility and acceptance requirements; SAD v1.0 layered architecture and verification/traceability; docs/GITHUB_ISSUES.txt HMS-S04. The uploaded ATM test plan is used only as a documentation structure, not an HMS specification.

## Final combined PR audit

The combined-integration job checks the actual pinned team candidate independently of standalone branch checks. It uses full-depth read-only checkout (no stored Git credentials), source snapshots listed in docs/integration/refs.json, real M1/M2/M4 code, all assigned components and patched lockfiles. It never merges into main or edits teammate branches. The actual contract check remains nonzero when M1 omits STAFF. A subsequent diagnostic run explicitly applies only the documented STAFF export to /tmp; it is not a completed owner fix and cannot mask the earlier failure.

Local commands: `bash scripts/ci/combined-integration.sh` (currently BLOCKED exit 2); `bash scripts/ci/combined-integration.sh --with-proposed-staff-export` (currently FAIL exit 1: two teammate audit tests). Both require MySQL hms_test and the pinned Git objects; stage intended edits first because the source snapshot uses the index. The fixture retains each underlying test/build failure while running independent frontend checks. Latest conditional local outcome: backend 51/53 pass, frontend 32/32 pass including real registration/login/fee/complaint/assignment/resolution/notification UI journeys, build and both audits PASS. See docs/integration/local-results.json and OWNER_FIXES.md. No tests were removed or changed to accept the missing audit functionality.

After teammate fixes are reviewed, refresh the pinned refs and rerun without the proposal flag. Standalone PR status checks still require reviewed main integration; this job does not hide their failures or replace required checks. Stack PRs carrying the old main-only workflow cannot inherit S04's all-PR trigger until the workflow is integrated; copying the full S04 change into every feature would obscure their separate scopes.


## Follow-up frontend and issue #21 coverage

The fixture now imports the complete explicit `integration/HMS-frontend-fee-review` frontend snapshot (normal-merge history of #39/#40/#42 and our existing feature branches). This fixes a verification gap: the old composer copied Login/Register alone and omitted M1 Profile/Students/Users. The candidate preserves all genuine page implementations and all shared tests; it uses the S03 single entry and role-guarded page adapters. The integration branch is a review candidate, not a replacement PR or an approved backend integration.

The additional real fee contract suite checks MySQL persisted decimal amounts, linked payments, totals, outstanding dues, SRN search, zero/negative/excessive amounts, impossible dates, cross-student assessment ownership, nonexistent students and real 401/403 responses. Each invalid case is independent so one backend defect cannot hide other results. Live React tests now cover warden assessment/payment writes, refreshed dues/payment tables, student balances and M1 account-page reachability. No API responses or SQL data are mocked in those final tests.

No new standalone workflow defect was found: MySQL 8 health checks and hms_test settings, Node22 compatibility, independent high+ audits, all-PR triggers and existing issue validation remain intact. Missing source in main-based snapshots is still a real integration blocker. Project automation remains an owner-configured metadata-only workflow. The GitHub API/full signed-in logs are Forbidden; public job steps/annotations and locally reproduced failures are the available evidence, never a claim to have read unavailable stdout.


Final follow-up local result (Node22): actual combination BLOCKED exit2; with only the explicit temporary STAFF proposal, all 40 frontend tests/build pass and backend executes 66 tests (61 PASS, 5 FAIL). Two failures concern the pre-existing owner audit gaps; three assert impossible fee calendars should return field-validation errors. The complete current M1 backend test directory is now copied, preserving its production bcrypt-cost test as well as auth tests. Workflow regression tests: 14 PASS. Both full dependency audits: zero vulnerabilities. The separate fee-owner calendar proposal passes 12/12 real fee contract tests; it never changes the actual failing combined result.
