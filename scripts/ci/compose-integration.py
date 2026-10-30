#!/usr/bin/env python3
"""Temporary candidate only. Never writes teammate implementations to checkout."""
import json,subprocess,sys
from pathlib import Path
root=Path(sys.argv[1]); refs=json.loads(Path('docs/integration/refs.json').read_text())
def copy(key,prefix):
 ref=refs[key]
 files=subprocess.check_output(['git','ls-tree','-r','--name-only',ref,'--',prefix],text=True).splitlines()
 if not files:raise RuntimeError(f'Missing source {key}:{prefix}')
 for file in files:
  path=root/file
  path.parent.mkdir(parents=True,exist_ok=True)
  path.write_bytes(subprocess.check_output(['git','show',f'{ref}:{file}']))
for prefix in ['frontend/src','frontend/index.html','frontend/vite.config.js','frontend/vitest.config.js','backend/src/routes/complaints.js','backend/src/routes/notifications.js','backend/src/utils/notify.js','backend/tests/complaints.test.js','backend/tests/complaint-assignment.test.js','backend/tests/complaint-resolution.test.js','backend/tests/notifications.test.js']:
 copy('complaints',prefix)
for prefix in ['frontend/src/pages/Fees.jsx','frontend/src/tests/fees.test.jsx']:copy('fees',prefix)
for prefix in ['backend/src/routes/auth.js','backend/src/routes/profile.js','backend/src/routes/admin.js','backend/src/middleware/auth.js','backend/src/utils/errors.js','backend/tests/auth.test.js','frontend/src/pages/Login.jsx','frontend/src/pages/Register.jsx']:copy('m1',prefix)
for prefix in ['backend/src/routes/inventory.js','backend/src/routes/allocations.js','backend/src/utils/audit.js','backend/tests/room.test.js']:copy('m2',prefix)
for prefix in ['backend/src/routes/fees.js','backend/src/routes/visitors.js','backend/src/routes/leave.js','backend/src/routes/reports.js','backend/tests/admin.test.js']:copy('m4',prefix)
for prefix in ['backend/src/app.js','backend/src/config.js','backend/src/server.js','backend/src/middleware/common.js','backend/tests/tls.test.js']:copy('tls',prefix)
for prefix in ['backend/scripts/perf','backend/tests/performance.test.js']:copy('performance',prefix)
for prefix in ['backend/scripts/monitoring','backend/tests/availability.test.js']:copy('availability',prefix)
# This is the explicit proposed merge resolution of our App mounts only.
p=root/'frontend/src/App.jsx';s=p.read_text();assert '<Pending title="Fees" />' in s
s=s.replace("import Dashboard from './pages/Dashboard';", "import Dashboard from './pages/Dashboard';\nimport Fees from './pages/Fees';").replace('<Pending title="Fees" />','<Fees />');p.write_text(s)
# Use the actual S03 entry unchanged: it discovers genuine M1 pages.
assert 'import.meta.glob' in (root/'frontend/src/main.jsx').read_text()
p=root/'backend/src/app.js';s=p.read_text()
for owner,name,mount in [('M1','auth','/api/auth'),('M1','profile','/api'),('M1','admin','/api/admin'),('M2','inventory','/api'),('M2','allocations','/api'),('M3','complaints','/api'),('M3','notifications','/api'),('M4','fees','/api'),('M4','visitors','/api'),('M4','leave','/api'),('M4','reports','/api/reports')]:
 old=f"  // mounted by {owner} PR: app.use('{mount}', require('./routes/{name}'));"
 assert old in s,f'Review mount {name} after upstream changes'
 s=s.replace(old,f"  app.use('{mount}', require('./routes/{name}'));")
p.write_text(s)
(root/'frontend/src/tests/live-ui.test.jsx').write_text(Path('tests/integration/live-ui.test.jsx').read_text())
