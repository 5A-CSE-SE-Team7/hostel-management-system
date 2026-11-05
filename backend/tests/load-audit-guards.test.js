const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, existsSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

// Adversarial CLI inputs, not acceptance measurements. Rejection must happen
// before database access and must never publish a successful evidence artifact.
const validSettings = { status: 'PASS', virtualUsersRequested: 100,
  authenticatedVirtualUsers: 100, login: { successes: 100, errors: 0 },
  authenticatedRequests: { errors: 0 }, rampUpSeconds: 300,
  durationSeconds: 30, timeoutMs: 5000 };

for (const [name, database, overrides, message] of [
  ['non-load database', 'hms_e2e', {}, /synthetic load database/],
  ['failed workload', 'hms_load_999999', { status: 'FAIL' }, /failed workload/],
  ['changed deadline', 'hms_load_999999', { timeoutMs: 10000 }, /10000 !== 5000/],
]) {
  test(`load audit verifier rejects ${name} without publishing evidence`, () => {
    const directory = mkdtempSync(join(tmpdir(), 'hms-load-guard-'));
    try {
      const input = join(directory, 'input.json');
      const output = join(directory, 'evidence.json');
      writeFileSync(input, JSON.stringify({ ...validSettings, ...overrides }));
      const env = { ...process.env, NODE_ENV: 'test', DB_NAME: database };
      delete env.NODE_TEST_CONTEXT; // The child is a CLI, not another test worker.
      const result = spawnSync(process.execPath,
        [resolve(__dirname, '../scripts/perf/verify-load-audit.cjs'), input, output],
        { env, encoding: 'utf8', timeout: 10000 });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, message);
      assert.equal(existsSync(output), false);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
}
