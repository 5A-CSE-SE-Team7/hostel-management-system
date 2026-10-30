#!/usr/bin/env python3
"""Compose real submitted scopes in an isolated export, never patch owner code."""
import json, subprocess, sys
from pathlib import Path
sprint1 = '--m4-sprint1' in sys.argv[2:]
root = Path(sys.argv[1])
refs = json.loads(Path('docs/integration/refs.json').read_text())
def copy(key, prefix):
    files = subprocess.check_output(['git','ls-tree','-r','--name-only',refs[key],'--',prefix],text=True).splitlines()
    if not files: raise RuntimeError(f'Missing source {key}:{prefix}')
    for file in files:
        target = root/file
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(subprocess.check_output(['git','show',f'{refs[key]}:{file}']))
# PR52 normally inherits genuine PR53/54/55 and PR43/44. Start with its exact
# Sprint1 sources, manifests and all owner tests, including actual new M2 tests.
for prefix in ['backend/src','backend/tests','frontend','scripts/verify-sprint1.sh']:
    copy('m4Sprint1',prefix)
# Select the real S05 seed/helper module in both scopes; do not inherit an old
# runner seed script while copying the new owner's helper tests.
for prefix in ['backend/scripts/seed.js','backend/tests/helpers.js','backend/tests/seed-helpers.test.js']:
    copy('seedHelpers',prefix)
# Explicitly select submitted current M2 refs; never silently use old M2 fixtures.
for prefix in ['backend/src/routes/inventory.js','backend/tests/room.test.js','frontend/src/pages/Inventory.jsx','frontend/src/tests/inventory-navigation.test.jsx']:
    copy('inventory',prefix)
for prefix in ['backend/src/routes/inventory.js','backend/src/routes/allocations.js','backend/tests/allocations.test.js','frontend/src/pages/Allocations.jsx','frontend/src/pages/MyRoom.jsx','frontend/src/tests/allocation-navigation.test.jsx']:
    copy('m2',prefix)
if sprint1:
    for path in ['frontend/src/pages/Fees.jsx','frontend/src/pages/Reports.jsx','backend/src/routes/reports.js','backend/src/routes/notifications.js']:
        assert not (root/path).exists(), f'Sprint2 source leaked into Sprint1: {path}'
else:
    # Normal-merge frontend candidate preserves every genuine feature and test.
    copy('frontendIntegration','frontend')
    for prefix in ['backend/src/routes/complaints.js','backend/src/routes/notifications.js','backend/src/utils/notify.js','backend/tests/complaints.test.js','backend/tests/complaint-assignment.test.js','backend/tests/complaint-resolution.test.js','backend/tests/notifications.test.js']:
        copy('complaints',prefix)
    for prefix in ['backend/src/routes/reports.js','backend/tests/admin.test.js','backend/tests/sprint1.test.js']:
        copy('m4',prefix)
    for prefix in ['backend/src/app.js','backend/src/config.js','backend/src/server.js','backend/src/middleware/common.js','backend/tests/tls.test.js']:
        copy('tls',prefix)
    for prefix in ['backend/scripts/perf','backend/tests/performance.test.js']:
        copy('performance',prefix)
    for prefix in ['backend/scripts/monitoring','backend/tests/availability.test.js']:
        copy('availability',prefix)
    p=root/'backend/src/app.js';s=p.read_text()
    for owner,name,mount in [('M1','auth','/api/auth'),('M1','profile','/api'),('M1','admin','/api/admin'),('M2','inventory','/api'),('M2','allocations','/api'),('M3','complaints','/api'),('M3','notifications','/api'),('M4','fees','/api'),('M4','visitors','/api'),('M4','leave','/api'),('M4','reports','/api/reports')]:
        old=f"  // mounted by {owner} PR: app.use('{mount}', require('./routes/{name}'));"
        active=f"  app.use('{mount}', require('./routes/{name}'));"
        if old in s: s=s.replace(old,active)
        else: assert active in s, f'Review upstream mount {name}'
    p.write_text(s)
    target=root/'frontend/integration/complete.test.jsx'
    target.write_text(Path('tests/integration/live-ui.test.jsx').read_text().replace("from '../", "from '../src/"))
assert 'accountPages={accountPages}' in (root/'frontend/src/main.jsx').read_text()
