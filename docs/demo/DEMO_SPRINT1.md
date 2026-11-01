# Sprint 1 Demonstration Guide

**Project:** Hostel Management System (Team 7)  
**Lead:** Aadi Basal (`aadi-basal-06`, PES2UG24CS005)  
**Assignment Reference:** Assignment 2g-2h (Sprint 1, Issue #35)  
**Target Video Location:** `docs/demo/sprint1.mp4` (Duration: <= 60 seconds)  

---

## 1. Environment & Setup

Before recording, ensure MySQL is running and seeded with demo accounts:
```bash
# 1. Start database
docker compose up -d # or brew services start mysql

# 2. Seed data
cd backend && npm run db:init && npm run db:seed
npm run dev

# 3. Start frontend
cd ../frontend && npm run dev
```

Demo Credentials:
- **Admin:** `admin@hms.test` / `Hostel@123`
- **Warden:** `warden@hms.test` / `Hostel@123`
- **Student 1:** `student1@hms.test` / `Hostel@123`

---

## 2. Sprint 1 Demo Sequence (60 Seconds)

| Timestamp | Visual Action | Narration Script |
| :--- | :--- | :--- |
| **0:00 - 0:14** | Open `http://localhost:5173/login`. Log in as `student1@hms.test`. Show student dashboard and role-specific sidebar (Complaints, Fees, Visitors, Leave). | *"Welcome to the Hostel Management System Sprint 1 demo. We start by logging in as a student with secure server-side sessions and RBAC navigation."* |
| **0:15 - 0:28** | Click **Complaints**. Fill in: Category: "Electrical", Location: "Block A - Room 101", Description: "Ceiling fan speed regulator sparking". Submit. Show complaint listed with `submitted` badge. | *"Students can log maintenance complaints with location and description, which are immediately assigned a pending status."* |
| **0:29 - 0:42** | Sign out. Log in as `warden@hms.test`. Navigate to **Hostel Inventory / Allocations**. Select Student 1, allocate Bed 1 in Block A Room 102. Show success and updated bed occupancy. | *"Switching to the Warden role, the interface adapts to administrative services. We allocate an available bed to an eligible student with strict concurrency protection."* |
| **0:43 - 0:53** | Open **Complaints**, assign the submitted complaint to Maintenance One, and show its assigned status. | *"The warden assigns the reported complaint to an active maintenance staff member and tracks its priority and status."* |
| **0:54 - 1:00** | Log out. Show health check endpoint `/api/health` in browser returning `{"status":"ok"}`. | *"All critical operations are written to our SHA-256 tamper-evident audit trail, and backend health is verified. Thank you."* |

## Integration prerequisites and evidence status

This branch now contains the genuine integrated Sprint1 shell, accounts/audit, inventory/allocation, complaint submission/assignment and Visitors/Leave screens. This document remains a storyboard, not a recorded video. Use the verified PR52 branch with its real seeded API before recording. The Sprint1 fee requirement is an API; its optional demonstration must use actual authenticated fee requests. The #48 fee frontend and Reports remain Sprint2 and are not prerequisites for this video. Do not install placeholder modules or suppress missing imports to run the demo.

Visitor/leave/report screens are preserved in the additive full M4 PR #51; #52 intentionally adds no second fee UI. A menu item or screen must be present and tested in the actual integrated build before showing it in a recording. The complaint submission status is `submitted`, not `pending`.

`docs/demo/sprint1.mp4` (or an actual published recording link) is still required by issue #35. This guide alone is not evidence that the video acceptance criterion is complete. No recording or screenshot is claimed here.
