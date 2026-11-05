// Read-only postcondition for the synthetic load fixture; never part of timed traffic.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const config = require('../../src/config');
const { pool } = require('../../src/db');
const { verifyChain } = require('../../src/utils/audit');
async function main() {
  if (!config.isTest || !/^hms_load_\d+$/.test(config.db.database)) throw new Error('Use a synthetic load database only');
  const result = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  assert.equal(result.status, 'PASS', 'A failed workload cannot establish audit acceptance');
  assert.equal(result.virtualUsersRequested, 100);
  assert.equal(result.authenticatedVirtualUsers, 100);
  assert.equal(result.login.successes, 100);
  assert.equal(result.login.errors, 0);
  assert.equal(result.authenticatedRequests.errors, 0);
  assert.equal(result.rampUpSeconds, 300);
  assert.equal(result.durationSeconds, 30);
  assert.equal(result.timeoutMs, 5000);
  assert.equal(pool.pool.config.connectionLimit, 20);
  const [[account]] = await pool.query('SELECT password_hash FROM users WHERE email = ?', ['admin@hms.test']);
  const passwordHashCost = require('bcryptjs').getRounds(account.password_hash);
  assert.equal(passwordHashCost, 12);
  const [[sessions]] = await pool.query('SELECT COUNT(*) count FROM sessions');
  assert.equal(Number(sessions.count), 100, 'Exactly 100 independent sessions must be persisted');
  const requests = result.samples.authenticatedRequests;
  const expected = {
    LOGIN: result.login.successes,
    COMPLAINT_RECORD_VIEW: requests.filter(r => r.ok && r.endpoint === '/api/complaints?limit=10').length,
    FEE_DUES_VIEW: requests.filter(r => r.ok && r.endpoint === '/api/fees/dues').length,
  };
  const [rows] = await pool.query('SELECT action, COUNT(*) count FROM audit_logs GROUP BY action');
  const actual = Object.fromEntries(rows.map(row => [row.action, Number(row.count)]));
  for (const [action, count] of Object.entries(expected)) assert.equal(actual[action] || 0, count, `Missing audit events: ${action}`);
  const chain = await verifyChain();
  assert.equal(chain.valid, true, 'Audit chain must remain valid after concurrent load');
  const evidence = { applicationCommit: result.applicationCommit, passwordHashCost,
    connectionLimit: pool.pool.config.connectionLimit, persistedSessions: Number(sessions.count),
    workerPool: process.env.UV_THREADPOOL_SIZE || 'Node default', expected, actual, chain };
  fs.writeFileSync(process.argv[3], JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
