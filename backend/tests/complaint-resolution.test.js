const test = require('node:test');
const assert = require('node:assert/strict');
if (process.env.DB_NAME !== 'hms_test') throw new Error('Use isolated hms_test');
const h = require('./helpers');
const { verifyChain } = require('../src/utils/audit');
let student, warden, assigned, other, cid, maint;
test.before(async () => {
  await h.resetDb(); student = await h.login(await h.mkUser('student'));
  warden = await h.login(await h.mkUser('warden'));
  maint = await h.mkUser('maintenance', 1); assigned = await h.login(maint);
  other = await h.login(await h.mkUser('maintenance', 2));
  const cat = await h.seedCategory(); cid = (await student.post('/api/complaints').send({ categoryId: cat, location: 'A101', description: 'Fan broken' })).body.complaintId;
});
test.after(h.closeAll);
test('TC-Comp-03 unauthenticated/student/unassigned actors cannot progress', async () => {
  assert.equal((await h.request(h.app).patch(`/api/complaints/${cid}/status`).send({ status: 'in_progress' })).status, 401);
  assert.equal((await student.patch(`/api/complaints/${cid}/status`).send({ status: 'in_progress' })).status, 403);
  assert.equal((await other.patch(`/api/complaints/${cid}/status`).send({ status: 'in_progress' })).status, 403);
  assert.equal((await warden.patch(`/api/complaints/${cid}/status`).send({ status: 'in_progress' })).status, 409);
});
test('assignment must start before resolution; assigned staff can start work', async () => {
  await warden.post(`/api/complaints/${cid}/assign`).send({ assignedTo: maint.id });
  const direct = await assigned.patch(`/api/complaints/${cid}/status`).send({ status: 'resolved', resolutionDetails: 'Fixed' });
  assert.equal(direct.status, 409); assert.equal(direct.body.errorCode, 'INVALID_TRANSITION');
  const result = await assigned.patch(`/api/complaints/${cid}/status`).send({ status: 'in_progress' });
  assert.equal(result.status, 200); assert.equal(result.body.status, 'in_progress'); assert.ok(result.body.updatedAt);
});
test('resolution requires details; concurrent identical changes cannot both succeed', async () => {
  for (const resolutionDetails of ['', '   ', 'x'.repeat(2001)]) assert.equal((await assigned.patch(`/api/complaints/${cid}/status`).send({ status: 'resolved', resolutionDetails })).status, 400);
  const results = await Promise.all([assigned, warden].map(actor => actor.patch(`/api/complaints/${cid}/status`).send({ status: 'resolved', resolutionDetails: ' Replaced capacitor ' })));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  const record = (await student.get(`/api/complaints/${cid}`)).body;
  assert.equal(record.status, 'resolved'); assert.equal(record.resolutionDetails, 'Replaced capacitor'); assert.ok(record.resolvedAt);
  const [[count]] = await h.pool.query("SELECT COUNT(*) AS n FROM audit_logs WHERE action = 'COMPLAINT_STATUS' AND entity_id = ?", [String(cid)]);
  assert.equal(count.n, 2); assert.equal((await verifyChain()).valid, true);
  assert.equal((await warden.patch(`/api/complaints/${cid}/status`).send({ status: 'in_progress' })).status, 409);
});
