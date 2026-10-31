#!/usr/bin/env bash
# Separate diagnostic: never replaces the unpatched combined CI result.
set -euo pipefail
root="$(mktemp -d /tmp/hms-fee-proposal.XXXXXX)"
trap 'rm -rf "$root"' EXIT
git checkout-index --all --prefix="$root/"
python scripts/ci/compose-integration.py "$root"
git show "$(node -p 'require("./docs/integration/refs.json").frontendIntegration'):docs/proposals/issue-21-calendar-validation.patch" > "$root/fee-proposal.patch"
echo 'PROPOSAL ONLY: temporary STAFF contract export and issue21 fee date patch; no teammate branch or source checkout is edited.'
(cd "$root/backend" && npm ci --no-fund && npm audit --audit-level=high)
printf '\nmodule.exports.STAFF = ["warden", "admin"];\n' >> "$root/backend/src/middleware/auth.js"
(cd "$root" && git apply --check fee-proposal.patch && git apply fee-proposal.patch)
(cd "$root/backend" && NODE_ENV=test DB_NAME=hms_test node --test --test-concurrency=1 tests/fee-contract.test.js)
