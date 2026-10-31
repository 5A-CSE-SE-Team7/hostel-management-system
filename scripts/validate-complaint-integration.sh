#!/usr/bin/env bash
set -euo pipefail
# Run from repository root. Uses the staged source snapshot so uncommitted
# development changes can be tested too; stage intended changes before running.
# No teammate code is written into this checkout or committed by this script.
root="$(mktemp -d /tmp/hms-complaint-integration.XXXXXX)"
trap 'rm -rf "$root"' EXIT
git checkout-index --all --prefix="$root/"
m1=b14ab0bae2fd06d80cffff6232fd44c8d41b8ee4
m2=17ad39d1de05beef6fc23b511d64cd86635dd9bc
s04=e764dd26a93b71f581abf8abcc0feedff7036b86
for file in src/routes/auth.js src/middleware/auth.js; do
  mkdir -p "$root/backend/$(dirname "$file")"
  git show "$m1:backend/$file" > "$root/backend/$file"
done
git show "$m2:backend/src/utils/audit.js" > "$root/backend/src/utils/audit.js"
# Reuse reviewed patched dependency manifests; keep feature PR scopes separate.
for component in backend frontend; do
  for file in package.json package-lock.json; do
    git show "$s04:$component/$file" > "$root/$component/$file"
  done
  (cd "$root/$component" && npm ci --no-fund && npm audit --audit-level=high)
done
# Enable the genuine M1 auth mount only in the temporary integration fixture.
python - "$root/backend/src/app.js" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()
old="  // mounted by M1 PR: app.use('/api/auth', require('./routes/auth'));"
assert old in s, 'Review M1 integration mount after upstream changes'
p.write_text(s.replace(old, "  app.use('/api/auth', require('./routes/auth'));"))
PY
(cd "$root/backend" && NODE_ENV=test DB_NAME=hms_test node --test --test-concurrency=1 tests/unit.test.js tests/complaints.test.js)
(cd "$root/frontend" && npm test && npm run build)
