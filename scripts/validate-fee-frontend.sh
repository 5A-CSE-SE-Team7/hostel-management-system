#!/usr/bin/env bash
set -euo pipefail
root="$(mktemp -d /tmp/hms-fee-integration.XXXXXX)"
trap 'rm -rf "$root"' EXIT
git checkout-index --all --prefix="$root/"
m1=b14ab0bae2fd06d80cffff6232fd44c8d41b8ee4
m2=17ad39d1de05beef6fc23b511d64cd86635dd9bc
m4=ebff728868b13825dc0df6126debf2efebca234a
notify=40f6f07e512044fc2223a24fb6cb328772982605
s04=e764dd26a93b71f581abf8abcc0feedff7036b86
mkdir -p "$root/backend/src/routes"
for file in src/routes/auth.js src/routes/profile.js src/middleware/auth.js; do git show "$m1:backend/$file" > "$root/backend/$file"; done
git show "$m2:backend/src/utils/audit.js" > "$root/backend/src/utils/audit.js"
git show "$m4:backend/src/routes/fees.js" > "$root/backend/src/routes/fees.js"
git show "$notify:backend/src/utils/notify.js" > "$root/backend/src/utils/notify.js"
for component in backend frontend; do
  for file in package.json package-lock.json; do git show "$s04:$component/$file" > "$root/$component/$file"; done
  (cd "$root/$component" && npm ci --no-fund && npm audit --audit-level=high)
done
python - "$root/backend/src/app.js" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]);s=p.read_text()
for owner,path,mount in [('M1','auth','/api/auth'),('M1','profile','/api'),('M4','fees','/api')]:
 old=f"  // mounted by {owner} PR: app.use('{mount}', require('./routes/{path}'));"
 assert old in s
 s=s.replace(old,f"  app.use('{mount}', require('./routes/{path}'));")
p.write_text(s)
PY
(cd "$root" && NODE_ENV=test DB_NAME=hms_test node --test frontend/tests/fee-api-contract.cjs)
(cd "$root/frontend" && npm test && npm run build)
