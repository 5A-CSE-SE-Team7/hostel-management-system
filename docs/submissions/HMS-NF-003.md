Title: feat(HMS-NF-003): sampled availability monitor and coverage reporting
Head: feature/HMS-NF-003-availability
Base: main
Refs #28

Adds semantic health monitoring, persistent JSONL observations, conservative availability/coverage reports, maintenance exclusions, systemd scheduling configuration and operational policy. PASS: 3 tests and one real local health observation; evidence explicitly reports incomplete monthly coverage and monthlyTargetVerified=false. No month-long availability or deployed monitoring claim. See docs/verification/HMS-NF-003.md. Keep draft pending deployment/observation acceptance; reviewer aadi-basal-06.
