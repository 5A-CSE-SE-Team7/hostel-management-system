import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Execute from backend, matching CI and the documented local command.
const files = readdirSync('tests').filter(name => name.endsWith('.test.js') && name !== 'unit.test.js').sort();
if (!files.length) {
  console.error('BLOCKED: no backend integration test files are present. Integrate teammate module tests; a unit-only run is not integration evidence.');
  process.exit(1);
}
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files.map(name => resolve('tests', name))], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
