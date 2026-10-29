#!/usr/bin/env bash
# Creates labels, milestones and all backlog issues in the current repo using the GitHub CLI.
# Prereqs: `gh auth login`, run from inside the cloned repo (or set REPO=owner/name).
# Edit the ASSIGNEE_* variables (GitHub usernames) before running. Safe to re-run for labels/milestones; issues will duplicate if re-run.
set -euo pipefail
REPO="${REPO:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
ASSIGNEE_ADITYA="${ASSIGNEE_ADITYA:-REPLACE_ME}"
ASSIGNEE_ABHISHEK="${ASSIGNEE_ABHISHEK:-REPLACE_ME}"
ASSIGNEE_AAYAAN="${ASSIGNEE_AAYAAN:-REPLACE_ME}"
ASSIGNEE_AADI="${ASSIGNEE_AADI:-REPLACE_ME}"

echo "Creating labels in $REPO ..."
gh label create "type: infra" --color 1d76db --force -R "$REPO" >/dev/null
gh label create "module: Shared" --color 5319e7 --force -R "$REPO" >/dev/null
gh label create "sprint-1" --color 0e8a16 --force -R "$REPO" >/dev/null
gh label create "SP-3" --color fbca04 --force -R "$REPO" >/dev/null
gh label create "SP-5" --color fbca04 --force -R "$REPO" >/dev/null
gh label create "SP-2" --color fbca04 --force -R "$REPO" >/dev/null
gh label create "type: FR" --color 1d76db --force -R "$REPO" >/dev/null
gh label create "module: M1" --color 5319e7 --force -R "$REPO" >/dev/null
gh label create "type: SR" --color 1d76db --force -R "$REPO" >/dev/null
gh label create "module: M2" --color 5319e7 --force -R "$REPO" >/dev/null
gh label create "sprint-2" --color 0e8a16 --force -R "$REPO" >/dev/null
gh label create "module: M3" --color 5319e7 --force -R "$REPO" >/dev/null
gh label create "module: Security" --color 5319e7 --force -R "$REPO" >/dev/null
gh label create "module: M4" --color 5319e7 --force -R "$REPO" >/dev/null
gh label create "SP-8" --color fbca04 --force -R "$REPO" >/dev/null
gh label create "type: NFR" --color 1d76db --force -R "$REPO" >/dev/null
gh label create "module: System" --color 5319e7 --force -R "$REPO" >/dev/null
gh label create "type: test" --color 1d76db --force -R "$REPO" >/dev/null
gh label create "type: docs" --color 1d76db --force -R "$REPO" >/dev/null

echo "Creating milestones ..."
for m in "Sprint 1" "Sprint 2"; do gh api "repos/$REPO/milestones" -f title="$m" >/dev/null 2>&1 || echo "  (milestone $m already exists)"; done

echo "Creating issues ..."
# --- 01/38 HMS-S01
gh issue create -R "$REPO" --title '[HMS-S01] Repo, branching, Project board and team workflow setup' \
  --label "type: infra,module: Shared,sprint-1,SP-3" --milestone "Sprint 1" --assignee "$ASSIGNEE_AADI" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As the team lead, I want the repo, Project board and PR workflow configured so that every backlog item is tracked and reviewed.

**SRS requirement:** Assignment 1a-1d, 2b-2d   |   **Test case:** -   |   **Story points:** 3

### Tasks
- [ ] Create the GitHub Project (Board view + Table view) and link it to the repo
- [ ] Add Project fields: Story Points (number), Sprint (iteration), Module (single select M1-M4/Shared)
- [ ] Create labels and milestones 'Sprint 1' and 'Sprint 2' (see section 3 of this document)
- [ ] Protect `main`: require PR, 1 review from a repo owner, and passing CI checks
- [ ] Commit README, .gitignore, CODEOWNERS, PR template and issue template

### Acceptance criteria
- [ ] Project is linked to the repo and shows all backlog issues
- [ ] Direct pushes to `main` are blocked
- [ ] PR template appears on every new PR

### Where this lives in the repo
- `.github/pull_request_template.md`
- `.github/CODEOWNERS`
- `.github/ISSUE_TEMPLATE/user-story.md`
- `README.md`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 02/38 HMS-S02
gh issue create -R "$REPO" --title '[HMS-S02] Backend skeleton: config, DB pool, schema, error handling, logging, health check' \
  --label "type: infra,module: Shared,sprint-1,SP-5" --milestone "Sprint 1" --assignee "$ASSIGNEE_AADI" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a developer, I want a layered Express + MySQL skeleton so that every module plugs into the same request, validation and error pipeline.

**SRS requirement:** SRS 2.4, 2.5, 3.3; SAD 3.5, 4.4; HMS-NF-003   |   **Test case:** -   |   **Story points:** 5

### Tasks
- [ ] Express app factory with helmet, CORS, JSON body limit, request-id and structured access log
- [ ] MySQL pool + `withTransaction` helper; `db/schema.sql` with every table from the SAD
- [ ] Standard error shape {errorCode, message, details?, requestId} and status mapping 400/401/403/404/409/500
- [ ] `validate()` helper and `GET /api/health`
- [ ] `npm run db:init` script

### Acceptance criteria
- [ ] `npm run db:init` creates all tables on an empty MySQL database
- [ ] Errors never leak SQL or stack traces
- [ ] `/api/health` returns 200 and 503 when the DB is down

### Where this lives in the repo
- `backend/src/app.js`
- `backend/src/config.js`
- `backend/src/db.js`
- `backend/src/middleware/common.js`
- `backend/src/utils/errors.js`
- `backend/src/utils/validate.js`
- `backend/db/schema.sql`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 03/38 HMS-S03
gh issue create -R "$REPO" --title '[HMS-S03] Frontend skeleton: React shell, API client, auth context, accessible UI kit, role-based navigation' \
  --label "type: infra,module: Shared,sprint-1,SP-5" --milestone "Sprint 1" --assignee "$ASSIGNEE_AAYAAN" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a user, I want a responsive, keyboard-friendly interface with navigation that matches my role.

**SRS requirement:** SRS 3.1; SAD 4.5; HMS-NF-005   |   **Test case:** TC-UX-01   |   **Story points:** 5

### Tasks
- [ ] Vite + React + React Router project with dev proxy to the API
- [ ] `api.js` fetch wrapper (cookies, JSON, standard error handling) and `AuthProvider`
- [ ] Reusable accessible form components (labels, field errors, aria-live alerts), tables, badges
- [ ] Sidebar navigation filtered by role; skip-to-content link; dark/high-contrast friendly CSS

### Acceptance criteria
- [ ] Each role only sees its own menu items
- [ ] All inputs have visible labels; focus outline visible
- [ ] `npm run build` succeeds

### Where this lives in the repo
- `frontend/src/App.jsx`
- `frontend/src/api.js`
- `frontend/src/auth.jsx`
- `frontend/src/components/ui.jsx`
- `frontend/src/styles.css`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 04/38 HMS-S04
gh issue create -R "$REPO" --title '[HMS-S04] GitHub Actions: CI (tests + build), PR link check, auto-add to Project' \
  --label "type: infra,module: Shared,sprint-1,SP-3" --milestone "Sprint 1" --assignee "$ASSIGNEE_AAYAAN" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a reviewer, I want automated checks on every PR so that broken code is never merged.

**SRS requirement:** Assignment 2b   |   **Test case:** -   |   **Story points:** 3

### Tasks
- [ ] `ci.yml`: MySQL service container, backend unit + integration tests, frontend build, npm audit (non-blocking)
- [ ] `pr-checks.yml`: fail if the PR body has no `Closes #N` / `Refs #N`
- [ ] `project-automation.yml`: add new issues/PRs to the Project (set `PROJECT_URL` variable and `ADD_TO_PROJECT_PAT` secret)
- [ ] Mark `backend` and `frontend` jobs as required status checks on `main`

### Acceptance criteria
- [ ] A PR with failing tests cannot be merged
- [ ] New issues appear on the Project board automatically

### Where this lives in the repo
- `.github/workflows/ci.yml`
- `.github/workflows/pr-checks.yml`
- `.github/workflows/project-automation.yml`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 05/38 HMS-S05
gh issue create -R "$REPO" --title '[HMS-S05] Synthetic seed data and shared test helpers' \
  --label "type: infra,module: Shared,sprint-1,SP-2" --milestone "Sprint 1" --assignee "$ASSIGNEE_ABHISHEK" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a tester, I want repeatable synthetic data so that every TC can be run without real personal data.

**SRS requirement:** STP section 6 (test data)   |   **Test case:** -   |   **Story points:** 2

### Tasks
- [ ] `npm run db:seed`: one admin, warden, 2 maintenance, 6 students, complaint categories, 2 blocks x 3 rooms x 2 beds
- [ ] Test helpers: reset DB, create users per role, login agent, inventory builder

### Acceptance criteria
- [ ] All demo accounts share the documented synthetic password
- [ ] No real credentials or personal data anywhere in the repo

### Where this lives in the repo
- `backend/scripts/seed.js`
- `backend/tests/helpers.js`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 06/38 HMS-F-001
gh issue create -R "$REPO" --title '[HMS-F-001] Student registration (SRN, name, institutional email, contact, profile)' \
  --label "type: FR,module: M1,sprint-1,SP-5" --milestone "Sprint 1" --assignee "$ASSIGNEE_ADITYA" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a student, I want to register with my SRN and institutional email so that I can access hostel services.

**SRS requirement:** HMS-F-001   |   **Test case:** TC-Auth-01   |   **Story points:** 5

### Tasks
- [ ] `POST /api/auth/register` with validation (SRN alphanumeric, email format, optional institutional domain via env, contact format)
- [ ] Reject duplicate email/SRN with 409 (`EMAIL_EXISTS` / `SRN_EXISTS`); create `users` + `students` rows in one transaction
- [ ] Registration form with inline field errors
- [ ] Audit event `REGISTER`

### Acceptance criteria
- [ ] AC-HMS-F001: valid required details create a student account
- [ ] Duplicate SRN/email is rejected
- [ ] Invalid input returns 400 with per-field details

### Where this lives in the repo
- `backend/src/routes/auth.js`
- `frontend/src/pages/Register.jsx`
- `backend/tests/auth.test.js`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 07/38 HMS-F-002
gh issue create -R "$REPO" --title '[HMS-F-002] Authentication: login, secure server-side session, logout' \
  --label "type: FR,module: M1,sprint-1,SP-5" --milestone "Sprint 1" --assignee "$ASSIGNEE_ADITYA" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a registered user, I want to sign in with my institutional credentials and get a session for my role.

**SRS requirement:** HMS-F-002   |   **Test case:** TC-Auth-02   |   **Story points:** 5

### Tasks
- [ ] `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` using express-session stored in MySQL
- [ ] Session cookie: httpOnly, SameSite=Lax, Secure in production; regenerate session id on login
- [ ] Same 401 message for unknown user and wrong password; rate-limit login/register
- [ ] Login page + session bootstrap in the UI

### Acceptance criteria
- [ ] AC-HMS-F002: correct credentials grant a role-based session
- [ ] Wrong credentials give 401 without revealing which part was wrong
- [ ] Logout invalidates the session

### Where this lives in the repo
- `backend/src/routes/auth.js`
- `backend/src/app.js`
- `frontend/src/pages/Login.jsx`
- `frontend/src/auth.jsx`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 08/38 HMS-F-003
gh issue create -R "$REPO" --title '[HMS-F-003] View and update permitted profile fields' \
  --label "type: FR,module: M1,sprint-1,SP-3" --milestone "Sprint 1" --assignee "$ASSIGNEE_ADITYA" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a student or warden, I want to view and edit my permitted profile fields without being able to change protected ones.

**SRS requirement:** HMS-F-003   |   **Test case:** TC-Auth-03   |   **Story points:** 3

### Tasks
- [ ] `GET/PUT /api/profile`; `GET/PUT /api/students/:id` for staff
- [ ] Whitelist editable fields; SRN, email and role are never editable here
- [ ] Profile page and staff Students page (search + edit)

### Acceptance criteria
- [ ] AC-HMS-F003: updated permitted fields persist and display correctly
- [ ] Attempts to send `role`, `srn` or `email` are ignored

### Where this lives in the repo
- `backend/src/routes/profile.js`
- `frontend/src/pages/Profile.jsx`
- `frontend/src/pages/Students.jsx`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 09/38 HMS-F-004
gh issue create -R "$REPO" --title '[HMS-F-004] Role-based access control and System Administrator role management' \
  --label "type: FR,module: M1,sprint-1,SP-5" --milestone "Sprint 1" --assignee "$ASSIGNEE_ADITYA" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a System Administrator, I want to create staff accounts and assign roles so that each user only reaches functions for their role.

**SRS requirement:** HMS-F-004; HMS-SR-003 (shared)   |   **Test case:** TC-Auth-04   |   **Story points:** 5

### Tasks
- [ ] `requireAuth` / `requireRole` middleware applied server-side on every protected router
- [ ] Admin endpoints: list users, create warden/maintenance/admin, change role, activate/deactivate (cannot lock yourself out)
- [ ] Users & roles page; role changes audited (`ROLE_CHANGED`, `ROLE_ASSIGNED`)

### Acceptance criteria
- [ ] AC-HMS-F004: users cannot access functions outside their role (403)
- [ ] Unauthenticated calls get 401
- [ ] Role-management actions appear in the audit log

### Where this lives in the repo
- `backend/src/middleware/auth.js`
- `backend/src/routes/admin.js`
- `frontend/src/pages/Users.jsx`
- `backend/tests/auth.test.js`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 10/38 HMS-SR-002
gh issue create -R "$REPO" --title '[HMS-SR-002] Password storage: salted one-way hashes and password policy' \
  --label "type: SR,module: M1,sprint-1,SP-2" --milestone "Sprint 1" --assignee "$ASSIGNEE_ADITYA" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a security owner, I want passwords stored only as salted strong hashes so that a database leak does not expose credentials.

**SRS requirement:** HMS-SR-002   |   **Test case:** TC-Sec-02   |   **Story points:** 2

### Tasks
- [ ] bcrypt (cost 12 in production) for register and admin-created accounts
- [ ] Password policy: 8-72 chars with a letter and a digit
- [ ] DB inspection test: every hash matches bcrypt format, none equal a known plaintext, all unique

### Acceptance criteria
- [ ] AC: database inspection finds no plaintext passwords

### Where this lives in the repo
- `backend/src/routes/auth.js`
- `backend/tests/auth.test.js`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 11/38 HMS-F-005
gh issue create -R "$REPO" --title '[HMS-F-005] Hostel block / room / bed inventory management (create, edit, deactivate)' \
  --label "type: FR,module: M2,sprint-1,SP-5" --milestone "Sprint 1" --assignee "$ASSIGNEE_ABHISHEK" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a warden, I want to maintain blocks, rooms and beds so that allocations reflect the real hostel.

**SRS requirement:** HMS-F-005   |   **Test case:** TC-Room-01   |   **Story points:** 5

### Tasks
- [ ] `POST /api/blocks|rooms|beds`, `PATCH /api/blocks|rooms|beds/:id`, `GET /api/inventory` (tree with occupancy)
- [ ] Deactivation cascades down but is refused (409 `OCCUPIED`) while any affected bed is allocated
- [ ] Unique constraints: block name, room per block, bed per room
- [ ] Inventory page (forms + collapsible tree)

### Acceptance criteria
- [ ] AC-HMS-F005: inventory CRUD changes persist
- [ ] Occupied beds/rooms/blocks cannot be deactivated
- [ ] Duplicate names return 409

### Where this lives in the repo
- `backend/src/routes/inventory.js`
- `frontend/src/pages/Inventory.jsx`
- `backend/tests/room.test.js`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 12/38 HMS-F-006
gh issue create -R "$REPO" --title '[HMS-F-006] Allocate an available bed to an eligible student' \
  --label "type: FR,module: M2,sprint-1,SP-5" --milestone "Sprint 1" --assignee "$ASSIGNEE_ABHISHEK" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a warden, I want to allocate only available beds to eligible students so that nobody is double-booked.

**SRS requirement:** HMS-F-006   |   **Test case:** TC-Room-02   |   **Story points:** 5

### Tasks
- [ ] `POST /api/allocations` in one transaction: lock bed row, validate active chain, validate student has no current allocation
- [ ] DB-level guard: generated unique keys on current bed and current student (SAD risk: double allocation)
- [ ] `GET /api/beds/available`, `GET /api/occupancy`, student `GET /api/me/room`
- [ ] Allocations page; notify the student; audit `ALLOCATION_CREATE`
- [ ] Concurrency test: 6 parallel requests for one bed -> exactly one 201

### Acceptance criteria
- [ ] AC-HMS-F006: a student receives only an available bed and occupancy updates
- [ ] Concurrent requests never double-allocate
- [ ] Inactive beds are never allocated

### Where this lives in the repo
- `backend/src/routes/allocations.js`
- `backend/db/schema.sql (allocations)`
- `frontend/src/pages/Allocations.jsx`
- `frontend/src/pages/MyRoom.jsx`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 13/38 HMS-F-007
gh issue create -R "$REPO" --title '[HMS-F-007] Transfer a student to another bed atomically' \
  --label "type: FR,module: M2,sprint-2,SP-5" --milestone "Sprint 2" --assignee "$ASSIGNEE_ABHISHEK" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a warden, I want to move a student to another bed so that the old bed is freed and the new one recorded in a single step.

**SRS requirement:** HMS-F-007   |   **Test case:** TC-Room-03   |   **Story points:** 5

### Tasks
- [ ] `POST /api/allocations/:id/transfer {targetBedId}`: release old + insert new in one transaction
- [ ] A failed transfer (target occupied/inactive) leaves the original allocation untouched
- [ ] Transfer control on the Allocations page; student notified; audit `ALLOCATION_TRANSFER`

### Acceptance criteria
- [ ] AC-HMS-F007: old allocation released and new recorded atomically
- [ ] Transfer to an occupied bed returns 409 and changes nothing
- [ ] History keeps the old row as `transferred`

### Where this lives in the repo
- `backend/src/routes/allocations.js`
- `backend/tests/room.test.js`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 14/38 HMS-F-008
gh issue create -R "$REPO" --title '[HMS-F-008] Check-in / check-out dates, occupancy history and current occupancy view' \
  --label "type: FR,module: M2,sprint-2,SP-5" --milestone "Sprint 2" --assignee "$ASSIGNEE_ABHISHEK" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a warden, I want to record check-in and check-out so that occupancy and history are always accurate.

**SRS requirement:** HMS-F-008   |   **Test case:** TC-Room-04   |   **Story points:** 5

### Tasks
- [ ] `POST /api/allocations/:id/check-in|check-out` with state validation and date sanity (check-out >= check-in)
- [ ] Check-out releases the bed but keeps the history row
- [ ] History tables for staff and for the student (My room)

### Acceptance criteria
- [ ] AC-HMS-F008: check-in/out changes update occupancy history
- [ ] Cannot check out before check-in; cannot check in twice

### Where this lives in the repo
- `backend/src/routes/allocations.js`
- `frontend/src/pages/Allocations.jsx`
- `frontend/src/pages/MyRoom.jsx`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 15/38 HMS-SR-005
gh issue create -R "$REPO" --title '[HMS-SR-005] Tamper-evident audit logging for all critical actions' \
  --label "type: SR,module: M2,sprint-1,SP-5" --milestone "Sprint 1" --assignee "$ASSIGNEE_ABHISHEK" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As an administrator, I want a tamper-evident audit trail so that unauthorised changes to history are detectable.

**SRS requirement:** HMS-SR-005; SO-2   |   **Test case:** TC-Sec-05   |   **Story points:** 5

### Tasks
- [ ] `audit()` helper writing user, role, action, entity, timestamp, IP; each row hashes the previous row (SHA-256 chain, serialised through a locked head row)
- [ ] Call it for login, registration, allocation, complaint, fee, visitor, leave, report and role actions
- [ ] `GET /api/admin/audit` and `GET /api/admin/audit/verify`; Audit page with 'Verify integrity'
- [ ] Test: edit a row directly in SQL -> verify reports `valid:false`

### Acceptance criteria
- [ ] AC: required audit events are recorded with user and timestamp
- [ ] Tampering with or deleting a row is detected by the verify endpoint

### Where this lives in the repo
- `backend/src/utils/audit.js`
- `backend/src/routes/admin.js`
- `frontend/src/pages/Audit.jsx`
- `backend/tests/admin.test.js`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 16/38 HMS-F-009
gh issue create -R "$REPO" --title '[HMS-F-009] Submit a complaint (category, location, description, optional attachment reference)' \
  --label "type: FR,module: M3,sprint-1,SP-3" --milestone "Sprint 1" --assignee "$ASSIGNEE_AAYAAN" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a student, I want to report a maintenance problem so that it gets fixed.

**SRS requirement:** HMS-F-009   |   **Test case:** TC-Comp-01   |   **Story points:** 3

### Tasks
- [ ] `POST /api/complaints`; `GET /api/complaint-categories` (configurable categories, seeded)
- [ ] Students only see their own complaints (others get 404)
- [ ] Complaint form and 'my complaints' tracking table

### Acceptance criteria
- [ ] AC-HMS-F009: a valid complaint is created with a unique identifier
- [ ] Unknown category or missing fields return 400

### Where this lives in the repo
- `backend/src/routes/complaints.js`
- `frontend/src/pages/Complaints.jsx`
- `backend/tests/complaints.test.js`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 17/38 HMS-F-010
gh issue create -R "$REPO" --title '[HMS-F-010] Assign complaint to maintenance staff and set priority/status' \
  --label "type: FR,module: M3,sprint-1,SP-5" --milestone "Sprint 1" --assignee "$ASSIGNEE_AAYAAN" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a warden, I want to assign complaints to maintenance staff with a priority so the urgent ones are handled first.

**SRS requirement:** HMS-F-010   |   **Test case:** TC-Comp-02   |   **Story points:** 5

### Tasks
- [ ] `POST /api/complaints/:id/assign {assignedTo, priority}`; `PATCH /api/complaints/:id/priority`; `GET /api/maintenance-staff`
- [ ] Assignee must be an active maintenance user; resolved complaints cannot be reassigned (409)
- [ ] Assign/priority controls in the staff complaint table

### Acceptance criteria
- [ ] AC-HMS-F010: the assigned complaint shows the selected staff member and status
- [ ] Students cannot assign (403)

### Where this lives in the repo
- `backend/src/routes/complaints.js`
- `frontend/src/pages/Complaints.jsx`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 18/38 HMS-F-011
gh issue create -R "$REPO" --title '[HMS-F-011] Maintenance staff update progress and resolve complaints' \
  --label "type: FR,module: M3,sprint-2,SP-5" --milestone "Sprint 2" --assignee "$ASSIGNEE_AAYAAN" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As maintenance staff, I want to update progress and record how a complaint was resolved.

**SRS requirement:** HMS-F-011   |   **Test case:** TC-Comp-03   |   **Story points:** 5

### Tasks
- [ ] `PATCH /api/complaints/:id/status` with transition table (assigned -> in_progress -> resolved); resolution details mandatory to resolve
- [ ] Only the assigned maintenance user (or warden/admin) may update; invalid transition -> 409
- [ ] Maintenance dashboard of assigned work

### Acceptance criteria
- [ ] AC-HMS-F011: status transitions and resolution details are stored
- [ ] Unassigned maintenance staff get 403

### Where this lives in the repo
- `backend/src/routes/complaints.js`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/Complaints.jsx`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 19/38 HMS-F-012
gh issue create -R "$REPO" --title '[HMS-F-012] Notifications for complaint assigned / updated / resolved (in-app + optional e-mail)' \
  --label "type: FR,module: M3,sprint-2,SP-5" --milestone "Sprint 2" --assignee "$ASSIGNEE_AAYAAN" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a student, I want to be told when my complaint changes so I do not have to keep checking.

**SRS requirement:** HMS-F-012   |   **Test case:** TC-Comp-04   |   **Story points:** 5

### Tasks
- [ ] Notification adapter: persist in-app notification first, then optional SMTP e-mail with 3 retries; failures are logged and never fail the main action
- [ ] `GET /api/notifications`, unread count, mark read / read-all; Notifications page with unread badge in the nav
- [ ] Document the SMTP environment variables

### Acceptance criteria
- [ ] AC-HMS-F012: a relevant notification is generated after each configured status event
- [ ] E-mail failure does not roll back the status change

### Where this lives in the repo
- `backend/src/utils/notify.js`
- `backend/src/routes/notifications.js`
- `frontend/src/pages/Notifications.jsx`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 20/38 HMS-SR-001
gh issue create -R "$REPO" --title '[HMS-SR-001] Enforce HTTPS / TLS 1.2+ for all client-server traffic' \
  --label "type: SR,module: Security,sprint-2,SP-3" --milestone "Sprint 2" --assignee "$ASSIGNEE_AAYAAN" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a security owner, I want all traffic encrypted so that credentials and records cannot be sniffed.

**SRS requirement:** HMS-SR-001; SO-1   |   **Test case:** TC-Sec-01   |   **Story points:** 3

### Tasks
- [ ] `REQUIRE_HTTPS` guard (426 on plain HTTP), HSTS in production, `Secure` session cookie
- [ ] Optional in-process HTTPS with `minVersion: TLSv1.2`; reference `deploy/nginx.conf` (TLS 1.2/1.3 only)
- [ ] Capture TLS evidence (e.g. `nmap --script ssl-enum-ciphers` / testssl.sh output) for the test summary

### Acceptance criteria
- [ ] AC: all application traffic uses HTTPS/TLS
- [ ] TLS 1.0/1.1 handshakes are refused

### Where this lives in the repo
- `backend/src/middleware/common.js`
- `backend/src/server.js`
- `deploy/nginx.conf`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 21/38 HMS-F-013
gh issue create -R "$REPO" --title '[HMS-F-013] Hostel fee ledger: assessments, payments, dues and balances (API)' \
  --label "type: FR,module: M4,sprint-1,SP-5" --milestone "Sprint 1" --assignee "$ASSIGNEE_AADI" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a warden, I want to record fee assessments and payments so that each student's balance is always correct.

**SRS requirement:** HMS-F-013   |   **Test case:** TC-Admin-01   |   **Story points:** 5

### Tasks
- [ ] `POST /api/fees/assessments`, `POST /api/fees/payments` (optionally against an assessment), `GET /api/fees/ledger/:studentId`, `GET /api/fees/me`, `GET /api/fees/dues`
- [ ] DECIMAL(10,2) amounts; totals computed from records; payment-gateway processing stays out of scope
- [ ] Staff access to a ledger is audited (`FEE_LEDGER_VIEW`)

### Acceptance criteria
- [ ] AC-HMS-F013: ledger totals match recorded assessments and payments
- [ ] Students can only read their own ledger

### Where this lives in the repo
- `backend/src/routes/fees.js`
- `backend/tests/admin.test.js`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 22/38 HMS-F-013U
gh issue create -R "$REPO" --title '[HMS-F-013U] Fee ledger screens for students and wardens' \
  --label "type: FR,module: M4,sprint-2,SP-3" --milestone "Sprint 2" --assignee "$ASSIGNEE_AAYAAN" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a student I want to see what I owe; as a warden I want to record fees and payments from one screen.

**SRS requirement:** HMS-F-013   |   **Test case:** TC-Admin-01   |   **Story points:** 3

### Tasks
- [ ] Student 'My fees' page (assessed / paid / outstanding + tables)
- [ ] Warden page: dues list, student picker, add assessment, record payment

### Acceptance criteria
- [ ] Amounts shown with 2 decimals; staff forms show field-level errors

### Where this lives in the repo
- `frontend/src/pages/Fees.jsx`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 23/38 HMS-F-014
gh issue create -R "$REPO" --title '[HMS-F-014] Visitor records (register, approve/reject, complete)' \
  --label "type: FR,module: M4,sprint-1,SP-5" --milestone "Sprint 1" --assignee "$ASSIGNEE_AADI" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a warden or student, I want visitor entries recorded with identity, time, purpose and approval status.

**SRS requirement:** HMS-F-014   |   **Test case:** TC-Admin-02   |   **Story points:** 5

### Tasks
- [ ] `POST /api/visitors` (students create pending requests for themselves; staff record for any student)
- [ ] `GET /api/visitors` with status/date filters; `PATCH /api/visitors/:id/status` with a transition table
- [ ] Visitors page for both roles. Visitor policy is institution-defined (open question in the SAD)

### Acceptance criteria
- [ ] AC-HMS-F014: authorised staff can create and retrieve complete visitor records
- [ ] Students only see their own visitors

### Where this lives in the repo
- `backend/src/routes/visitors.js`
- `frontend/src/pages/Visitors.jsx`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 24/38 HMS-F-015
gh issue create -R "$REPO" --title '[HMS-F-015] Leave / outpass request and approval workflow with remarks' \
  --label "type: FR,module: M4,sprint-1,SP-5" --milestone "Sprint 1" --assignee "$ASSIGNEE_AADI" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a student, I want to request leave or an outpass and see the decision and remarks.

**SRS requirement:** HMS-F-015   |   **Test case:** TC-Admin-03   |   **Story points:** 5

### Tasks
- [ ] `POST /api/leave`, `GET /api/leave`, `POST /api/leave/:id/decision` (approved/rejected; remarks required on rejection), `POST /api/leave/:id/cancel`
- [ ] Status leaves `pending` only through an authorised action (row lock prevents double decisions)
- [ ] Leave page for students and wardens; student notified

### Acceptance criteria
- [ ] AC-HMS-F015: status changes only through authorised actions and remarks are retained
- [ ] End time must be after start time

### Where this lives in the repo
- `backend/src/routes/leave.js`
- `frontend/src/pages/Leave.jsx`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 25/38 HMS-F-016
gh issue create -R "$REPO" --title '[HMS-F-016] Administrative reports: occupancy, allocations, complaints, fee dues, visitors, leave (+CSV)' \
  --label "type: FR,module: M4,sprint-2,SP-8" --milestone "Sprint 2" --assignee "$ASSIGNEE_AADI" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a warden/admin, I want period-based reports so that I can review hostel activity.

**SRS requirement:** HMS-F-016   |   **Test case:** TC-Admin-04   |   **Story points:** 8

### Tasks
- [ ] `GET /api/reports/:type?from=&to=&format=csv` for 6 report types with period validation
- [ ] Reports page with summary + table + CSV download
- [ ] Tests proving report values equal the underlying records

### Acceptance criteria
- [ ] AC-HMS-F016: report values match underlying records for the selected period
- [ ] Students/maintenance get 403

### Where this lives in the repo
- `backend/src/routes/reports.js`
- `frontend/src/pages/Reports.jsx`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 26/38 HMS-NF-001
gh issue create -R "$REPO" --title '[HMS-NF-001] Performance: p90 <= 3 s for core pages and actions' \
  --label "type: NFR,module: System,sprint-2,SP-5" --milestone "Sprint 2" --assignee "$ASSIGNEE_AAYAAN" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a user, I want pages to load within 3 seconds for 90% of requests.

**SRS requirement:** HMS-NF-001   |   **Test case:** TC-Perf-01   |   **Story points:** 5

### Tasks
- [ ] Review slow queries (EXPLAIN) on inventory, allocations, complaints, reports; add indexes where needed
- [ ] Write a JMeter (or equivalent) plan for login + dashboard + list endpoints; record p90
- [ ] Attach results to the test summary

### Acceptance criteria
- [ ] 90th percentile <= 3 s in the load test under normal load

### Where this lives in the repo
- `backend/db/schema.sql`
- `backend/scripts/loadtest.sh`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 27/38 HMS-NF-002
gh issue create -R "$REPO" --title '[HMS-NF-002] Scalability: 500 concurrent authenticated users' \
  --label "type: NFR,module: System,sprint-2,SP-5" --milestone "Sprint 2" --assignee "$ASSIGNEE_ABHISHEK" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As an operator, I want the system to stay functional with 500 concurrent users.

**SRS requirement:** HMS-NF-002   |   **Test case:** TC-Perf-02   |   **Story points:** 5

### Tasks
- [ ] Tune DB pool / session store; run 500-virtual-user scenario with authenticated sessions
- [ ] Report concurrency success rate (STP section 14)

### Acceptance criteria
- [ ] Load test with 500 virtual users passes with no functional failures

### Where this lives in the repo
- `backend/src/db.js`
- `backend/scripts/loadtest.sh`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 28/38 HMS-NF-003
gh issue create -R "$REPO" --title '[HMS-NF-003] Availability: health monitoring and uptime evidence (99.5%)' \
  --label "type: NFR,module: System,sprint-2,SP-3" --milestone "Sprint 2" --assignee "$ASSIGNEE_AAYAAN" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As an operator, I want to monitor availability so that the 99.5% monthly target can be demonstrated.

**SRS requirement:** HMS-NF-003   |   **Test case:** TC-Rel-01   |   **Story points:** 3

### Tasks
- [ ] Use `/api/health` with an uptime monitor (UptimeRobot / cron + curl); document the deployment topology and process manager (systemd / pm2)
- [ ] Document the maintenance-window policy

### Acceptance criteria
- [ ] Uptime report available; target >= 99.5% excluding scheduled maintenance

### Where this lives in the repo
- `backend/src/app.js`
- `docs/OPERATIONS.md`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 29/38 HMS-NF-004
gh issue create -R "$REPO" --title '[HMS-NF-004] Daily backups and restore drill (<= 30 min)' \
  --label "type: NFR,module: System,sprint-2,SP-3" --milestone "Sprint 2" --assignee "$ASSIGNEE_ABHISHEK" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As an operator, I want daily backups and a rehearsed restore so that data loss is minimal.

**SRS requirement:** HMS-NF-004   |   **Test case:** TC-Rel-02   |   **Story points:** 3

### Tasks
- [ ] Schedule `backup.sh` with cron (retention configurable)
- [ ] Run a restore drill with `restore.sh`, time it, then verify the audit chain with `/api/admin/audit/verify`

### Acceptance criteria
- [ ] Restore drill completes in <= 30 minutes and data integrity is verified

### Where this lives in the repo
- `backend/scripts/backup.sh`
- `backend/scripts/restore.sh`
- `docs/OPERATIONS.md`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 30/38 HMS-NF-005
gh issue create -R "$REPO" --title '[HMS-NF-005] Accessibility: responsive layout and WCAG 2.1 AA audit' \
  --label "type: NFR,module: System,sprint-2,SP-5" --milestone "Sprint 2" --assignee "$ASSIGNEE_ADITYA" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a user with accessibility needs, I want to use every screen with keyboard and screen reader.

**SRS requirement:** HMS-NF-005   |   **Test case:** TC-UX-01   |   **Story points:** 5

### Tasks
- [ ] Audit all pages with axe DevTools / Lighthouse; fix contrast, labels, focus order, table semantics
- [ ] Verify layout at 375 px, 768 px and desktop widths; keyboard-only walkthrough of each role

### Acceptance criteria
- [ ] Accessibility and responsive-layout audit passes (no critical axe violations)

### Where this lives in the repo
- `frontend/src/styles.css`
- `frontend/src/components/ui.jsx`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 31/38 HMS-SR-003
gh issue create -R "$REPO" --title '[HMS-SR-003] Server-side RBAC sweep: every protected endpoint denies other roles' \
  --label "type: SR,module: Security,sprint-2,SP-3" --milestone "Sprint 2" --assignee "$ASSIGNEE_ADITYA" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a security owner, I want proof that no endpoint is reachable by the wrong role.

**SRS requirement:** HMS-SR-003; SO-1   |   **Test case:** TC-Sec-03   |   **Story points:** 3

### Tasks
- [ ] Build a Newman/Postman collection (or extend the Jest-style tests) calling every endpoint as each role and unauthenticated
- [ ] Fix any endpoint that returns anything other than 401/403 for a wrong role

### Acceptance criteria
- [ ] AC: an unauthorised role receives an access-denied response on every protected endpoint

### Where this lives in the repo
- `backend/tests/auth.test.js`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 32/38 HMS-SR-004
gh issue create -R "$REPO" --title '[HMS-SR-004] Restrict sensitive records and log access to critical records' \
  --label "type: SR,module: Security,sprint-2,SP-3" --milestone "Sprint 2" --assignee "$ASSIGNEE_ABHISHEK" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a student, I want my records visible only to me and authorised staff, with staff access logged.

**SRS requirement:** HMS-SR-004; SO-2   |   **Test case:** TC-Sec-04   |   **Story points:** 3

### Tasks
- [ ] Verify cross-student access is blocked on profile, fees, complaints, visitors, leave
- [ ] Confirm `STUDENT_RECORD_VIEW` and `FEE_LEDGER_VIEW` audit events; add the same for any other critical read you introduce

### Acceptance criteria
- [ ] Unauthorised access is blocked; permitted critical access produces an audit record

### Where this lives in the repo
- `backend/src/routes/profile.js`
- `backend/src/routes/fees.js`
- `backend/tests/admin.test.js`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 33/38 HMS-T01
gh issue create -R "$REPO" --title '[HMS-T01] Selenium end-to-end smoke tests for the main user journeys' \
  --label "type: test,module: System,sprint-2,SP-5" --milestone "Sprint 2" --assignee "$ASSIGNEE_ADITYA" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a QA lead, I want automated browser tests for the critical journeys.

**SRS requirement:** STP section 5 (system testing)   |   **Test case:** TC-Auth-01..04, TC-Room-02, TC-Comp-01..03   |   **Story points:** 5

### Tasks
- [ ] Selenium (or Playwright) tests: register -> login -> submit complaint; warden allocates bed; maintenance resolves complaint
- [ ] Run in Chrome and Firefox; add as an optional CI job

### Acceptance criteria
- [ ] Journeys pass against a seeded environment

### Where this lives in the repo
- `(new) e2e/`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 34/38 HMS-T02
gh issue create -R "$REPO" --title '[HMS-T02] Execute the Software Test Plan and update the RTM' \
  --label "type: test,module: System,sprint-2,SP-3" --milestone "Sprint 2" --assignee "$ASSIGNEE_AADI" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As the team lead, I want every planned test executed and recorded so the RTM shows real status.

**SRS requirement:** STP sections 13-14; SRS RTM   |   **Test case:** All TC-*   |   **Story points:** 3

### Tasks
- [ ] Run `npm test`, record outcomes per TC; run manual/perf/security TCs and attach evidence
- [ ] Change RTM status N -> P/F/A and write the Test Summary Report (coverage, defects, residual risks)

### Acceptance criteria
- [ ] 100% of planned TCs executed or exceptions documented
- [ ] RTM updated

### Where this lives in the repo
- `docs/TEST_EXECUTION.md (new)`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 35/38 HMS-D01
gh issue create -R "$REPO" --title '[HMS-D01] Sprint 1 demo video (1 minute) uploaded to the repo' \
  --label "type: docs,module: Shared,sprint-1,SP-2" --milestone "Sprint 1" --assignee "$ASSIGNEE_AADI" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a reviewer, I want a short video of the working product after Sprint 1.

**SRS requirement:** Assignment 2g-2h   |   **Test case:** -   |   **Story points:** 2

### Tasks
- [ ] Record login, allocation and complaint flow (<= 1 min)
- [ ] Commit to `docs/demo/sprint1.mp4` (or add a link) via PR

### Acceptance criteria
- [ ] Video shows a working product

### Where this lives in the repo
- `docs/demo/`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 36/38 HMS-D02
gh issue create -R "$REPO" --title '[HMS-D02] Sprint 2 demo video (2 minutes) uploaded to the repo' \
  --label "type: docs,module: Shared,sprint-2,SP-2" --milestone "Sprint 2" --assignee "$ASSIGNEE_AADI" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As a reviewer, I want a 2-minute video of the finished product.

**SRS requirement:** Assignment 3b   |   **Test case:** -   |   **Story points:** 2

### Tasks
- [ ] Record the end-to-end story across all four roles (<= 2 min)
- [ ] Commit to `docs/demo/sprint2.mp4` via PR

### Acceptance criteria
- [ ] Video shows all modules working

### Where this lives in the repo
- `docs/demo/`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 37/38 HMS-D03
gh issue create -R "$REPO" --title '[HMS-D03] Document deviations from the submitted SRS / SAD / STP' \
  --label "type: docs,module: Shared,sprint-2,SP-2" --milestone "Sprint 2" --assignee "$ASSIGNEE_ADITYA" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As an evaluator, I want every deviation listed with a reason so it can be explained in the demo.

**SRS requirement:** Assignment 2i   |   **Test case:** -   |   **Story points:** 2

### Tasks
- [ ] Start from the 'Known deviations' list in README.md and in this file; confirm each; add any new ones
- [ ] Commit `docs/DEVIATIONS.md`

### Acceptance criteria
- [ ] Every deviation has what / why / impact

### Where this lives in the repo
- `docs/DEVIATIONS.md (new)`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"
# --- 38/38 HMS-D04
gh issue create -R "$REPO" --title '[HMS-D04] Final documentation and development freeze' \
  --label "type: docs,module: Shared,sprint-2,SP-3" --milestone "Sprint 2" --assignee "$ASSIGNEE_AADI" \
  --body "$(cat <<'HMS_BODY_EOF'
**User story:** As the team lead, I want the docs final and the code frozen.

**SRS requirement:** Assignment 3c-3d   |   **Test case:** -   |   **Story points:** 3

### Tasks
- [ ] Update SRS/SAD/STP where reality differs (e.g. fix `HMS-F001` vs `HMS-F-001` ID inconsistency in SRS section 4)
- [ ] Tag `v1.0`, protect `main`, close the sprint milestone

### Acceptance criteria
- [ ] Docs match the product; `v1.0` tag exists

### Where this lives in the repo
- `docs/`

### Definition of done
- [ ] PR raised by the assignee and reviewed/merged by a repo owner (`Closes #N`)
- [ ] Tests pass in CI; RTM status updated
- [ ] Any deviation from SRS/SAD/STP noted in the PR
HMS_BODY_EOF
)"

echo "Done. Now add the issues to your Project and set the Story Points / Sprint / Module fields (or let project-automation.yml add them)."
