#!/usr/bin/env python3
"""Temporary candidate only. Never writes teammate implementations to checkout."""
import json,subprocess,sys
from pathlib import Path
sprint1 = '--m4-sprint1' in sys.argv[2:]
root=Path(sys.argv[1]); refs=json.loads(Path('docs/integration/refs.json').read_text())
def copy(key,prefix):
 ref=refs[key]
 files=subprocess.check_output(['git','ls-tree','-r','--name-only',ref,'--',prefix],text=True).splitlines()
 if not files:raise RuntimeError(f'Missing source {key}:{prefix}')
 for file in files:
  path=root/file
  path.parent.mkdir(parents=True,exist_ok=True)
  path.write_bytes(subprocess.check_output(['git','show',f'{ref}:{file}']))
for prefix in ['backend/src/routes/complaints.js','backend/src/routes/notifications.js','backend/src/utils/notify.js','backend/tests/complaints.test.js','backend/tests/complaint-assignment.test.js','backend/tests/complaint-resolution.test.js','backend/tests/notifications.test.js']:
 copy('complaints',prefix)
# Use the explicit normal-merge candidate so no genuine M1 account page,
# shared frontend regression, complaint feature or fee test is silently omitted.
for prefix in ['frontend/src','frontend/index.html','frontend/vite.config.js','frontend/vitest.config.js']:
 copy('frontendIntegration',prefix)
for prefix in ['backend/src/routes/auth.js','backend/src/routes/profile.js','backend/src/routes/admin.js','backend/src/middleware/auth.js','backend/src/utils/errors.js','backend/tests','frontend/src/pages/Login.jsx','frontend/src/pages/Register.jsx','frontend/src/tests']:copy('m1',prefix)
for prefix in ['backend/src/routes/inventory.js','backend/src/routes/allocations.js','backend/tests/room.test.js']:copy('m2',prefix)
# PR53 normally inherits M1 and preserves both real audit API contracts.
for prefix in ['backend/src/routes/admin.js','backend/src/utils/audit.js','backend/tests/audit-endpoints.test.js','backend/tests/audit-integration.test.js','frontend/src/pages/Audit.jsx','frontend/src/tests/audit-navigation.test.jsx']:
 copy('audit',prefix)
m4 = 'm4Sprint1' if sprint1 else 'm4'
for prefix in ['backend/src/routes/fees.js','backend/src/routes/visitors.js','backend/src/routes/leave.js','backend/src/utils/validate.js','backend/tests/sprint1.test.js','backend/tests/fee-contract.test.js','backend/tests/calendar-validation.test.js','backend/tests/calendar-api.test.js','backend/tests/startup-contract.test.js']:
 copy(m4,prefix)
if not sprint1:
 for prefix in ['backend/src/routes/reports.js','backend/tests/admin.test.js']:copy(m4,prefix)
# Full M4 screens use the shared shell and the canonical fee page from PR48.
# Sprint1 API validation does not claim to deliver these later full-M4 screens.
for prefix in ['frontend/src/pages/Visitors.jsx','frontend/src/pages/Leave.jsx','frontend/src/pages/Reports.jsx','frontend/src/pages/report-api.js','frontend/src/components/m4-ui.jsx','frontend/src/tests']:
 copy('m4',prefix)
for prefix in ['backend/src/app.js','backend/src/config.js','backend/src/server.js','backend/src/middleware/common.js','backend/tests/tls.test.js']:copy('tls',prefix)
for prefix in ['backend/scripts/perf','backend/tests/performance.test.js']:copy('performance',prefix)
for prefix in ['backend/scripts/monitoring','backend/tests/availability.test.js']:copy('availability',prefix)
# The candidate contains the reviewed shared entry and actual fee mount.
assert 'accountPages={accountPages}' in (root/'frontend/src/main.jsx').read_text()
p=root/'backend/src/app.js';s=p.read_text()
for owner,name,mount in [('M1','auth','/api/auth'),('M1','profile','/api'),('M1','admin','/api/admin'),('M2','inventory','/api'),('M2','allocations','/api'),('M3','complaints','/api'),('M3','notifications','/api'),('M4','fees','/api'),('M4','visitors','/api'),('M4','leave','/api'),('M4','reports','/api/reports')]:
 if sprint1 and name == 'reports':continue
 old=f"  // mounted by {owner} PR: app.use('{mount}', require('./routes/{name}'));"
 assert old in s,f'Review mount {name} after upstream changes'
 s=s.replace(old,f"  app.use('{mount}', require('./routes/{name}'));")
p.write_text(s)
(root/'frontend/src/tests/live-ui.test.jsx').write_text(Path('tests/integration/live-ui.test.jsx').read_text())
