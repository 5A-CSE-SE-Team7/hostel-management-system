process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'hms_test';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const h = require('./helpers');
const { audit, verifyChain, computeHash, GENESIS } = require('../src/utils/audit');
let admin, student;
test.before(async () => {
  await h.resetDb();
  admin = await h.login(await h.mkUser('admin'));
  student = await h.login(await h.mkUser('student'));
});
test.after(h.closeAll);
test('audit hash remains compatible with existing M1/M2 persisted rows', () => {
  const row = { user_id: 1, role: 'admin', action: 'EXISTING', entity: 'user', entity_id: '1', details: '{}', ip: '::1', created_at: '2026-10-30 12:00:00.000' };
  const expected = crypto.createHash('sha256').update(JSON.stringify([GENESIS, 1, 'admin', 'EXISTING', 'user', '1', '{}', '::1', row.created_at])).digest('hex');
  assert.equal(computeHash(GENESIS, row), expected);
});
test('event-object and request-style append share one verifiable chain', async () => {
  const row = await audit({ action: 'EVENT_CONTRACT', details: '{"preserved":true}', created_at: '2026-10-30T12:00:00.123Z' });
  assert.ok(row.id); assert.equal(row.details, '{"preserved":true}');
  await audit({ session: { user: { id: 1, role: 'admin' } }, ip: '127.0.0.1' }, 'REQUEST_CONTRACT', 'user', 1, { actual: true }, { strict: true });
  const [[stored]] = await h.pool.query('SELECT created_at, details FROM audit_logs WHERE id = ?', [row.id]);
  assert.equal(stored.created_at, row.created_at); assert.equal(stored.details, row.details);
  assert.equal((await verifyChain()).valid, true);
});
test('caller transaction rollback removes event and restores the chain head', async () => {
  const conn = await h.pool.getConnection();
  try {
    await conn.beginTransaction();
    await audit({ action: 'ROLLBACK_CONTRACT' }, conn);
    await conn.rollback();
  } finally { conn.release(); }
  const [[{ count }]] = await h.pool.query("SELECT COUNT(*) AS count FROM audit_logs WHERE action = 'ROLLBACK_CONTRACT'");
  assert.equal(count, 0); assert.equal((await verifyChain()).valid, true);
});
test('both list representations retain filters and reject unsafe pagination', async () => {
  const list = await admin.get('/api/admin/audit?action=EVENT_CONTRACT');
  assert.equal(list.status, 200); assert.equal(list.body.length, 1); assert.ok(list.body[0].createdAt);
  const page = await admin.get('/api/admin/audit?action=EVENT_CONTRACT&page=1&pageSize=1');
  assert.equal(page.status, 200); assert.equal(page.body.total, 1); assert.equal(page.body.items.length, 1); assert.ok(page.body.items[0].created_at);
  for (const query of ['page=0', 'pageSize=101', 'page=9007199254740992', 'page=2&pageSize=0', 'page=1.5']) {
    assert.equal((await admin.get(`/api/admin/audit?${query}`)).status, 400);
  }
  assert.equal((await h.request(h.app).get('/api/admin/audit?page=1')).status, 401);
  assert.equal((await student.get('/api/admin/audit?page=1')).status, 403);
});
