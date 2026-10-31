# HMS-F-010 — complaint assignment and priority

Aayaan Kamil / PES2UG24CS017; verified issue #17, assigned Aayaan721. Stacked base: feature/HMS-F-009-complaint-submission. No duplicated F009 diff, no edits to existing teammate branches.

Adds authorized maintenance directory, complaint assignment, independent priority updates, and accessible staff controls in complaint tracking. Only warden/admin may mutate. Assignee must be an active maintenance user. First assignment changes submitted to assigned; reassignment preserves in-progress state. Resolved complaints reject assignment with 409. Priority defaults to the actual existing value when omitted. Mutations lock the complaint row, validate the assignee under a share lock, and append genuine M2 strict audit in the same transaction.

Actual validation: bash scripts/validate-complaint-integration.sh from staged source, real pinned M1/M2 modules and MySQL hms_test, S04 patched dependencies. PASS: 14 backend tests (4 assignment + 7 submission + 3 baseline), 16 frontend tests, build, both full dependency audits with zero findings. Tests verify denied roles, directory privacy, inactive/invalid assignees, assignment response/state, reassignment visibility, progress preservation, priority and resolved-state rejection. No mock auth or hash chain implementation was used.

Standalone runtime/remote CI remains dependent on unmerged M1/M2/S03/S04. Notifications are intentionally the separate F012 task. GitHub Project/branch protection acceptance is an owner action, not evidence from this feature.
