# Standalone CI foundation verification — 2026-10-30

Main remains `3fc386a14454f296eb6ba7af94bef979425fc86b`. No main merge is authorized or performed by this work.

## Cause and repair

`backend/tests/unit.test.js` imports `../src/utils/audit` and `../src/middleware/auth`. They do not exist on main or the main-based PR41/47/49/50 heads. `frontend/index.html` imports `/src/main.jsx`, absent on those same branches. Both reported failures were reproduced with real installed dependencies; they are missing unmerged prerequisites. PR40 already had a functional entry; its backend lacked the same prerequisite.

PR42 already supplies real authentication **and a genuine audit helper**. PR53 is not an additional module required merely to satisfy require(audit); it supplies the audit owner's fuller feature, page and paginated contract and must integrate compatibly. Normal PR40 merges now retain PR39's history/root guard and integrate PR42's real accounts/backend, preserving the richer shared shell, named API adapters, generation-safe session handling, and scoped account CSS. PR53 normally inherits PR42 and PR40, keeps all account/RBAC routes and original tamper test, and adds a small event-object adapter to the existing single persisted hash format. Both unpaginated filtered arrays and explicit paginated responses are retained. No dummy module, schema rewrite or duplicate rendered entry is used.

## Verified current refs

- PR40: `7dfc2c42f87722dc5044c6524f9c2493da10a27e`; includes normal PR39 and PR42 merges.
- PR53: `30f58383231b627729ecb05f117f4f3d809d584f`; includes the protected real Audit page, compatibility regression tests, PR42/40 ancestry.
- Full frontend merge candidate: `bc7d60af83fa8ebf5393507ef77a5be800751514`, on the pre-existing integration branch; all complaint, fee, M4, notification and account routes retained.
- Other exact tested owner refs are in refs.json. M2 fixture routes are explicitly pinned to the existing integrated M2 branch; newer split M2 branch implementations are not claimed validated by this fixture.

The CI composition uses PR53's actual admin/helper/tests; M2 no longer overwrites that audit helper. The original PR53 endpoint/tamper test is preserved under `audit-endpoints.test.js` to avoid colliding with M4's `admin.test.js`. Live browser-component tests use genuine M1 sessions, HTTP and MySQL, including actual audit listing and chain verification.

Tamper tests deliberately corrupt audit rows. The runner now resets only isolated `hms_test` using the genuine existing helper before seeding the live frontend phase. The first new audit-page regression exposed that dirty fixture and failed; after isolation was fixed it passes. Backend failures remain nonzero and cannot be erased by the reset or subsequent successful UI checks.

## Executed validation

Node22.23.4 / real MySQL8:

| Candidate | Backend | Frontend | Build | Independent audits |
|---|---|---|---|---|
| PR40 foundation | 20 PASS | 22 PASS | PASS | Both 0 vulnerabilities |
| PR53 audit foundation | 25 PASS | 26 PASS | PASS | Both 0 vulnerabilities |
| Detached normal merges: PR53 + PR41 + PR47 + PR49 + PR50 | 4 unit + 28 integration PASS | 26 PASS | PASS | Both 0 vulnerabilities |
| Full actual owner-contract composition, including PR52/51 M4, complaint/fee stack | 91 PASS | 54 PASS | PASS | Both 0 vulnerabilities |
| Additional M4 Sprint1 API scope (reports unmounted) | 88 PASS | 12 fee/core/live PASS | PASS | Both 0 vulnerabilities |

Dependency smoke, actionlint, and all 14 CI utility tests PASS. No test was removed or vulnerability threshold changed. These counts are executed local results; GitHub job conclusions are verified separately. No production performance/TLS or month-long availability achievement is claimed.

## Safe merge sequence requiring owner approval

1. Merge PR42 normally after review. This supplies real auth/RBAC and the shared audit helper.
2. Merge PR40 normally. It already contains PR39 history and PR42, so PR39's minimal entry is absorbed; do not merge a second competing entry. No duplicate code or duplicate rendering is needed. The richer entry preserves both page integration and its root check.
3. Merge PR53 normally. It preserves M1/M2 compatibility and adds the genuine protected audit page and paginated API. PR42 → PR40 → PR53 previews are clean.
4. Merge PR41 after updated merge-ref CI passes, then PR47, then PR49 and PR50 after their updated merge-ref checks pass. The detached test candidate performed these normal merges cleanly and passed the actual standalone jobs. PR41 checks existing modules; it does not fabricate missing prerequisites.

PR42 + PR40 are sufficient to remove the two specific missing-module/entry errors; PR53 belongs in the recommended complete audit foundation rather than supplying a duplicate helper. PR41/47/49/50 raw heads intentionally remain scoped until main receives these foundations. Their current nonzero raw checks are dependency-blocked, not waived. No main merge, readiness change or protection bypass occurred.

The separate M4 order remains PR52 then PR51 (PR51 already inherits PR52); both merge cleanly with the updated audit foundation. They are included in full business regression coverage but are not prerequisites for merely resolving the two standalone import failures. M4/report completeness also requires the documented genuine M2/complaint/fee sources and frontend route integration. Do not assume all those independent PRs are ready because this foundation test passed. PR43 and PR48 previews against the new PR40 base are clean; no dependent branch was changed here.

## GitHub and owner boundaries

Current PR40 and PR53 build/backend/audit/backlog jobs pass. PR41 combined owner-contract check, workflow validation, both audits and backlog reference pass; its raw backend/frontend checks remain dependency-blocked on main. PR47/49/50 still show the earlier nonzero backend/frontend checks and passing audit/backlog checks. Inspect fresh merge-ref runs after an approved main merge; such runs cannot exist yet.

Public Actions pages expose completed job/step conclusions and annotations. Full runner log downloads require sign-in; api.github.com is excluded from this environment's enforced allowlist. Reported error text was reproduced locally rather than invented from inaccessible logs. Project membership/private branch protection remain owner-verification items; do not bypass them. Configure the real PROJECT_URL variable and ADD_TO_PROJECT_PAT secret/Project permissions as documented in CI_AUTOMATION.md if still required, and verify successful Project insertion after the approved workflow reaches main.
