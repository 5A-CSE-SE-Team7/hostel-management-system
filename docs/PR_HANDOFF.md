# PR handoff

Each assigned member must open their own pull request and a repository owner must review and merge it. Do not open a PR until the corresponding GitHub issues have been created in Step 3; replace each `#TBD` below with the real issue number(s).

## M1 — Aditya Kumar

- Branch: `feature/HMS-M1-auth-profile-rbac`
- Issues: registration, authentication, profile, RBAC, password security, accessibility, endpoint RBAC sweep, end-to-end tests, and deviations (`#TBD`).
- Title: `feat(auth): registration, profile and RBAC`
- Body: `Closes #TBD` followed by the relevant real issue references and test evidence.
- Command: `gh pr create --base main --head feature/HMS-M1-auth-profile-rbac --title "feat(auth): registration, profile and RBAC" --body "Closes #TBD"`

## M2 — Abhishek Kumar Singh

- Branch: `feature/HMS-M2-inventory-allocation`
- Issues: inventory, allocation, transfer, check-in/out, audit, scalability, backups, and sensitive-record access (`#TBD`).
- Title: `feat(inventory): allocation and audit workflows`
- Body: `Closes #TBD` followed by the relevant real issue references and test evidence. This branch must merge before the other module branches because it supplies `utils/audit.js`.
- Command: `gh pr create --base main --head feature/HMS-M2-inventory-allocation --title "feat(inventory): allocation and audit workflows" --body "Closes #TBD"`

## M3 — Aayaan Kamil

- Branch: `feature/HMS-M3-complaints-notify`
- Issues: frontend shell, CI automation, complaints, maintenance, notifications, TLS, fee screens, performance, availability (`#TBD`).
- Title: `feat(complaints): maintenance and notifications`
- Body: `Closes #TBD` followed by the relevant real issue references and test evidence. Rebase onto M2 after it merges, because the routers use `utils/audit.js`.
- Command: `gh pr create --base main --head feature/HMS-M3-complaints-notify --title "feat(complaints): maintenance and notifications" --body "Closes #TBD"`

## M4 — Aadi Basal

- Branch: `feature/HMS-M4-fees-visitors-leave`
- Issues: fees, visitors, leave/outpass, reports, test-plan execution, demos, and final documentation (`#TBD`).
- Title: `feat(admin): fees, visitors, leave and reports`
- Body: `Closes #TBD` followed by the relevant real issue references and test evidence. Rebase onto M2 after it merges, because the routers use `utils/audit.js`.
- Command: `gh pr create --base main --head feature/HMS-M4-fees-visitors-leave --title "feat(admin): fees, visitors, leave and reports" --body "Closes #TBD"`
