// Exercise the real session, transaction, notification and audit boundaries.
const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
test.after(h.closeAll);
test('TC-Room-03 real sessions preserve old allocation on failure and transfer atomically', async () => {
  await h.resetDb();
  const warden = await h.login(await h.mkUser('warden'));
  const user = await h.mkUser('student');
  const student = await h.login(user);
  const { bedIds } = await h.mkInventory(warden, 3, 'real-transfer');
  const allocation = await warden.post('/api/allocations').send({ studentId: user.id, bedId: bedIds[0] });
  assert.equal(allocation.status, 201);
  const path = `/api/allocations/${allocation.body.id}/transfer`;
  assert.equal((await student.post(path).send({ targetBedId: bedIds[1] })).status, 403);
  await warden.patch(`/api/beds/${bedIds[2]}`).send({ isActive: false });
  assert.equal((await warden.post(path).send({ targetBedId: bedIds[2] })).status, 409);
  assert.equal((await student.get('/api/me/room')).body.allocation.bed.id, bedIds[0]);
  const attempts = await Promise.all([1, 2].map(() => warden.post(path).send({ targetBedId: bedIds[1] })));
  assert.equal(attempts.filter(r => r.status === 200).length, 1);
  assert.ok(attempts.every(r => [200, 404, 409].includes(r.status)));
  assert.equal((await student.get('/api/me/room')).body.allocation.bed.id, bedIds[1]);
  const [rows] = await h.pool.query('SELECT status, released_at FROM allocations WHERE student_id=? ORDER BY id', [user.id]);
  assert.equal(rows.length, 2); assert.equal(rows[0].status, 'transferred'); assert.ok(rows[0].released_at); assert.equal(rows[1].released_at, null);
  const [[counts]] = await h.pool.query("SELECT COUNT(*) AS total FROM audit_logs WHERE action='ALLOCATION_TRANSFER'");
  assert.equal(counts.total, 1);
  const { verifyChain } = require('../src/utils/audit');
  assert.equal((await verifyChain()).valid, true);
});
