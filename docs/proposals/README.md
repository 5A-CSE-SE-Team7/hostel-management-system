# Review-only fee backend proposal

Issue #21 is assigned to aadi-basal-06. This patch targets the genuine M4 fees.js at ebff728868b13825dc0df6126debf2efebca234a. It is **not applied** to this integration branch or any teammate branch.

Real POST /api/fees/payments with paidOn=2026-02-30 returns 500 because the shared validator accepts normalized JavaScript dates and MySQL rejects the impossible date. The same applies to dueDate assessment writes. The patch adds calendar validation only within the fee route, without changing the shared validator or authentication/audit code. The owner may instead fix the shared validator after coordinating its wider impact.

Review/apply with `git apply --check docs/proposals/issue-21-calendar-validation.patch`, then `git apply docs/proposals/issue-21-calendar-validation.patch` on the owner-approved integration. Run the real fee-contract suite and existing backend suites. Current unpatched regression failures must remain failures; proposed-patch results must be reported separately. No auth/audit changes are included.
