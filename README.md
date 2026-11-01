# Hostel Management System (HMS) - Team 7

Browser-based hostel management for students, wardens, maintenance staff and system administrators.
Stack (from the SRS/SAD): **React** (Vite) + **Node.js/Express** REST/JSON API + **MySQL**, session-based auth, server-side RBAC.

| Module | Scope | Requirements | Owner |
|---|---|---|---|
| M1 | Registration, login/session, profile, RBAC | HMS-F-001..004, SR-002 | Aditya Kumar |
| M2 | Inventory, allocation, transfer, check-in/out, audit log | HMS-F-005..008, SR-005 | Abhishek Kumar Singh |
| M3 | Complaints, assignment, resolution, notifications | HMS-F-009..012 | Aayaan Kamil |
| M4 | Fees, visitors, leave/outpass, reports | HMS-F-013..016 | Aadi Basal (lead) |

The backlog (issues, story points, sprint plan) is in **`docs/GITHUB_ISSUES.txt`**; `scripts/create-issues.sh` creates them with the GitHub CLI.

## Quick start
```bash
docker compose up -d                 # MySQL 8 with the schema preloaded (or use your own MySQL)
cd backend && cp .env.example .env && npm install
npm run db:init && npm run db:seed   # (db:init is a no-op if docker loaded the schema)
npm run dev                          # API on http://localhost:4000

cd ../frontend && npm install && npm run dev   # UI on http://localhost:5173
```
Demo accounts (synthetic, password `Hostel@123`): `admin@hms.test`, `warden@hms.test`, `maint1@hms.test`, `student1@hms.test` ... `student6@hms.test`.

## Tests
```bash
cd backend
npm run test:unit      # no database needed
npm test               # integration tests against DB "hms_test" (needs MySQL; set DB_* env vars, user needs rights on hms_test)

cd ../frontend
npm ci
npm run test:e2e       # Chrome + Firefox browser smoke and axe checks
```
Test names carry the Test Plan IDs (TC-Auth-01..04, TC-Room-01..04, TC-Comp-01..04, TC-Admin-01..04, TC-Sec-02/03/04/05).
The current browser suite checks registration, login/profile/logout, keyboard focus, and axe WCAG 2.1 A/AA on available role pages at 375 px, 768 px, and desktop widths. The full complaint and bed-allocation journey is pending integration of those module screens.
Not covered by code tests and still to be evidenced: TC-Perf-01/02, TC-Rel-01/02, TC-UX-01, TC-Sec-01 (see `docs/OPERATIONS.md`).

## Design notes
- **Double allocation is prevented twice**: a row-locking transaction in `routes/allocations.js` and unique generated columns (`current_bed_key`, `current_student_key`) in `db/schema.sql`.
- **Transfer is atomic**: old allocation released and new one inserted in one transaction.
- **Audit trail is tamper-evident**: SHA-256 hash chain (`utils/audit.js`); `GET /api/admin/audit/verify` detects edited or removed rows.
- **Errors** always have the shape `{errorCode, message, details?, requestId}`; statuses 400/401/403/404/409/500 as in the SAD.
- **Notifications**: persisted first, optional SMTP e-mail afterwards (never blocks the business action).

## Project layout
```
backend/   src/{routes,middleware,utils}  db/schema.sql  scripts/  tests/
frontend/  src/{pages,components}
deploy/    nginx.conf          docs/   GITHUB_ISSUES.txt, OPERATIONS.md
.github/   workflows (CI, PR check, project automation), templates, CODEOWNERS
```

## Known deviations from the submitted documents
See section 7 of `docs/GITHUB_ISSUES.txt`; record the final list in `docs/DEVIATIONS.md`.
