# Sprint1 boundary and pending human acceptance

PR52 normally inherits the genuine PR53/54/55 foundations and PR43/44 complaint submission/assignment. Visitors and Leave pages and their protected navigation are now delivered here, matching issues23/24. No Reports, fee frontend, complaint resolution or complaint notification controllers are added to this Sprint1 branch. Fees remain the assigned Sprint1 API; #48 owns the Sprint2 fee UI.

All original visitor/leave live assertions have moved from PR51 into the explicit frontend integration suite. `npm test --prefix frontend` runs component/RBAC tests. `npm run test:integration --prefix frontend` requires HMS_API_BASE and exercises real API/session/MySQL contracts; `bash scripts/verify-sprint1.sh` runs both suites plus backend tests, build and independent audits on isolated hms_test. No integration test is silently skipped when the API is missing.

The updated #52 must be forward-merged into #51, preserving its report-only addition and issue ownership. Do not retarget stacked PRs, mark drafts ready or merge main automatically.

Human actions remain: a code-owner approval for #42 and other required reviews; configure/verify Project URL, token and board membership; record the actual <=60 second Sprint1 video (login, allocation, complaint). DEMO_SPRINT1.md is only a storyboard. Fee API may be demonstrated via actual requests; the fee UI stays Sprint2. No video or Project insertion is claimed. Broad closing keywords for unfulfilled #35 or #51 documentation/test/video/freeze issues require reviewer correction or real evidence before merge; this work does not close/reassign issues or edit PR metadata.
