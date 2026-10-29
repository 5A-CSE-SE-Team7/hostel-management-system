# PR handoff

Each assigned member must open their own pull request and a repository owner must review and merge it.

## M1 — Aditya Kumar

- Branch: `feature/HMS-M1-auth-profile-rbac`
- Issues: #6, #7, #8, #9, #10, #30, #31, #33, #37.
- Title: `feat(auth): registration, profile and RBAC`
- Body: `Closes #6, #7, #8, #9, #10, #30, #31, #33, #37` followed by test evidence.
- Command: `gh pr create --base main --head feature/HMS-M1-auth-profile-rbac --title "feat(auth): registration, profile and RBAC" --body "Closes #6, #7, #8, #9, #10, #30, #31, #33, #37"`

## M2 — Abhishek Kumar Singh

- Branch: `feature/HMS-M2-inventory-allocation`
- Issues: #5, #11, #12, #13, #14, #15, #27, #29, #32.
- Title: `feat(inventory): allocation and audit workflows`
- Body: `Closes #5, #11, #12, #13, #14, #15, #27, #29, #32` followed by test evidence. This branch must merge before the other module branches because it supplies `utils/audit.js`.
- Command: `gh pr create --base main --head feature/HMS-M2-inventory-allocation --title "feat(inventory): allocation and audit workflows" --body "Closes #5, #11, #12, #13, #14, #15, #27, #29, #32"`

## M3 — Aayaan Kamil

- Branch: `feature/HMS-M3-complaints-notify`
- Issues: #3, #4, #16, #17, #18, #19, #20, #22, #26, #28.
- Title: `feat(complaints): maintenance and notifications`
- Body: `Closes #3, #4, #16, #17, #18, #19, #20, #22, #26, #28` followed by test evidence. Rebase onto M2 after it merges, because the routers use `utils/audit.js`.
- Command: `gh pr create --base main --head feature/HMS-M3-complaints-notify --title "feat(complaints): maintenance and notifications" --body "Closes #3, #4, #16, #17, #18, #19, #20, #22, #26, #28"`

## M4 — Aadi Basal

- Branch: `feature/HMS-M4-fees-visitors-leave`
- Issues: #1, #2, #21, #23, #24, #25, #34, #35, #36, #38.
- Title: `feat(admin): fees, visitors, leave and reports`
- Body: `Closes #1, #2, #21, #23, #24, #25, #34, #35, #36, #38` followed by test evidence. Rebase onto M2 after it merges, because the routers use `utils/audit.js`.
- Command: `gh pr create --base main --head feature/HMS-M4-fees-visitors-leave --title "feat(admin): fees, visitors, leave and reports" --body "Closes #1, #2, #21, #23, #24, #25, #34, #35, #36, #38"`

## Assignment/branch note

Issue #22 is assigned to Aayaan but its `Fees.jsx` implementation is on the M4 branch under the supplied branch plan. Resolve that cross-branch ownership before opening either PR; do not close #22 from M4 unless Aayaan is the PR author.
