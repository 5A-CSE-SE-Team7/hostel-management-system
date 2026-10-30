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

Main currently has neither frontend/src nor frontend test files. Its backend lacks utils/audit.js (Abhishek), middleware/auth.js (Aditya), and module integration suites. Those checks remain nonzero until real implementations are integrated. Teammate branches remain unmerged into main; actual pinned integration is tested in an isolated workspace as described below. PR #39 also proposes frontend skeleton work; coordinate its scope with PR #40 to avoid competing frontend entries.

References: HMS SRS v1.0 security/accessibility and acceptance requirements; SAD v1.0 layered architecture and verification/traceability; docs/GITHUB_ISSUES.txt HMS-S04. The uploaded ATM test plan is used only as a documentation structure, not an HMS specification.

## Current combined PR integration

The read-only combined job snapshots committed real modules pinned in docs/integration/refs.json. It does not merge main or rewrite PR history. Current refs include actual repairs on existing PR42 and PR51 and the normally propagated complaint stack; the complete real frontend and M1 backend tests are retained.

Default local command on Node22: `bash scripts/ci/combined-integration.sh`. Actual result: PASS, 91/91 backend tests, 54/54 frontend tests, production build PASS, both full dependency audits zero vulnerabilities. No temporary STAFF export or fee calendar proposal is applied. The existing failure diagnostic is retained for older snapshots and cannot mask a nonzero actual-contract step.

The real network journeys cover registration/login, profile/account role navigation, student complaints, warden assignment, maintenance resolution, durable notifications and warden/student fee transactions. Real MySQL regressions cover impossible calendars, decimal totals, authorization and SQL tampering through the genuine audit helper. Details and exact source refs are committed under docs/integration/.

Standalone main-based PR checks may still fail until genuine prerequisites land on main; the full candidate passing does not change their results. Existing feature-base snapshots still carry the old main-only trigger until the reviewed S04 workflow is integrated. Preserve required checks and scope; never remove missing-module tests to break that dependency cycle. The Project workflow still needs owner settings/real board verification. Private API/full signed-in logs are Forbidden in this environment; public actual job steps/annotations and local reproductions are the available evidence.

Canonical compatible dependency manifests/lockfiles were also applied to the affected existing feature/M1/M4 branches after confirming no original dependency or script names were removed. Both audits now pass on those actual graphs; no severity threshold or security check was weakened. All four genuine M1 frontend account-navigation regression cases are retained in the candidate.


## M4 overlap resolved without duplicate implementation

Existing PR52 is the Sprint1 base; existing PR51 normally inherits it and adds reports/CSV plus retained M4 screens. The current default combined step still executes every full-suite backend/frontend test. An additional `--m4-sprint1` step validates the actual Sprint1 APIs with genuine M1/M2/M3 prerequisites (83 backend tests) and the 11 applicable fee/core UI tests; it is not a substitute for the full 86-backend/49-frontend check. Reports are intentionally not mounted in that separate Sprint1 scope. Both builds and both full audits pass.

M4 module assertions are copied from their real existing branches. Shared Sprint1 assertions execute once; the full module adds the report assertions with its own actual API fixture. The genuine shared calendar/numeric validator is composed too, preventing the old route/global validator mismatch. M4 frontend compatibility and CSV download contracts are tested over real HTTP sessions. The canonical #48 fee component remains unchanged; no competing M4 Fees.jsx is copied over it. See PR51 docs/integration/M4_PR_SEQUENCE.md.


## Standalone prerequisite resolution (2026-10-30)

The two original standalone failures were reproduced on Node22: backend unit.test.js imports missing ../src/utils/audit; frontend/index.html references absent /src/main.jsx. These are missing main prerequisites, not failed business assertions. PR40 now normally inherits PR39 and genuine PR42; its shell/API/session/account behavior is regression tested. PR53 normally inherits PR42 and PR40 and reconciles audit contracts without replacing users/RBAC endpoints. The full combined job pins that actual PR53 commit and preserves its endpoint/tamper/dual-contract tests and real frontend page. M2 no longer overwrites the audit helper during composition. Explicit pagination retains PR53's response; unpaginated filters retain existing M1/M4 callers.

The backend tamper tests deliberately alter audit rows. Before live frontend tests, the runner now uses the real resetDb helper to reset only hms_test and reseed. The new real HTTP audit-page journey verifies the chain rather than hiding its corruption. Full: 91 backend/54 frontend PASS; additional Sprint1: 88 backend/12 fee/core/live frontend PASS. Builds and independent full audits PASS. Sprint1 leaves reports unmounted and retains its smaller documented screen scope.

Safe foundation merge order for owner approval: PR42, PR40 (already contains PR39; no duplicate entry merge), PR53, then PR41 and PR47, followed by PR49 and PR50. Existing feature PRs remain scoped: do not copy audit/auth/frontend implementations into each branch or skip standalone tests. Until those foundations enter main, PR41/47/49/50 raw required checks remain dependency-blocked and nonzero. Re-evaluate each PR's merge ref and rerun CI after main changes; this local combined result does not claim that merge has happened. PR52 then PR51 is the separate additive M4 order; the full combined fixture additionally uses genuine M2 routes and the complaint/fee stack. See docs/integration/AUDIT_FOUNDATION.md on PR53 for audit format compatibility.

GitHub job pages expose conclusions/annotations, but complete runner logs require sign-in. This environment's enforced allowlist omits api.github.com: API/private branch-protection and Project membership verification are unavailable here. A public job conclusion and a locally reproduced error are reported separately from inaccessible log text. Keep real Project token/URL configuration and branch-protection verification as owner actions.
