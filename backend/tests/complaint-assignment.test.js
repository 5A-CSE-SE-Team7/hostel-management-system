const test = require('node:test');
const assert = require('node:assert/strict');
if (process.env.DB_NAME !== 'hms_test') throw new Error('Use isolated hms_test');
const h = require('./helpers');
const { verifyChain } = require('../src/utils/audit');
let student, warden, admin, maintenance, assignee, replacement, inactive, cid;
test.before(async () => {
  await h.resetDb();
  student = await h.login(await h.mkUser('student'));
  warden = await h.login(await h.mkUser('warden'));
  admin = await h.login(await h.mkUser('admin'));
  assignee = await h.mkUser('maintenance', 1); maintenance = await h.login(assignee);
  replacement = await h.mkUser('maintenance', 2); inactive = await h.mkUser('maintenance', 3);
  await h.pool.query('UPDATE users SET is_active = 0 WHERE id = ?', [inactive.id]);
  const category = await h.seedCategory();
  cid = (await student.post('/api/complaints').send({ categoryId: category, location: 'A101', description: 'Fan broken' })).body.complaintId;
});
test.after(h.closeAll);
test('TC-Comp-02 staff directory and assignment deny other roles', async () => {
  for (const actor of [student, maintenance]) {
    assert.equal((await actor.get('/api/maintenance-staff')).status, 403);
    assert.equal((await actor.post(`/api/complaints/${cid}/assign`).send({ assignedTo: assignee.id })).status, 403);
    assert.equal((await actor.patch(`/api/complaints/${cid}/priority`).send({ priority: 'high' })).status, 403);
  }
  const directory = await warden.get('/api/maintenance-staff');
  assert.equal(directory.status, 200); assert.equal(directory.body.length, 2);
  assert.ok(directory.body.every(person => !('email' in person) && !('password_hash' in person)));
});
test('assignment validates active maintenance identity and priority', async () => {
  for (const body of [{}, { assignedTo: inactive.id }, { assignedTo: 4294967295 }, { assignedTo: true }, { assignedTo: assignee.id, priority: 'invalid' }]) {
    assert.equal((await warden.post(`/api/complaints/${cid}/assign`).send(body)).status, 400);
  }
  const result = await warden.post(`/api/complaints/${cid}/assign`).send({ assignedTo: assignee.id, priority: 'high' });
  assert.deepEqual(result.body, { complaintId: cid, status: 'assigned', assignedTo: assignee.id, priority: 'high' });
  const detail = await student.get(`/api/complaints/${cid}`);
  assert.equal(detail.body.assignedTo, assignee.id); assert.equal(detail.body.assignedToName, assignee.name || 'maintenance 1');
  assert.equal((await maintenance.get('/api/complaints')).body.length, 1);
});
test('reassignment preserves progress/default priority and updates scope', async () => {
  await h.pool.query("UPDATE complaints SET status = 'in_progress' WHERE id = ?", [cid]);
  const result = await admin.post(`/api/complaints/${cid}/assign`).send({ assignedTo: replacement.id });
  assert.equal(result.body.status, 'in_progress'); assert.equal(result.body.priority, 'high');
  assert.equal((await maintenance.get(`/api/complaints/${cid}`)).status, 404);
  assert.equal((await verifyChain()).valid, true);
});
test('independent priority update is audited; resolved reassignment is forbidden', async () => {
  assert.equal((await warden.patch(`/api/complaints/${cid}/priority`).send({ priority: 'urgent' })).status, 200);
  assert.equal((await warden.patch(`/api/complaints/${cid}/priority`).send({})).status, 400);
  assert.equal((await warden.patch('/api/complaints/4294967295/priority').send({ priority: 'low' })).status, 404);
  await h.pool.query("UPDATE complaints SET status = 'resolved' WHERE id = ?", [cid]);
  const response = await warden.post(`/api/complaints/${cid}/assign`).send({ assignedTo: assignee.id });
  assert.equal(response.status, 409); assert.equal(response.body.errorCode, 'INVALID_TRANSITION');
  assert.equal((await student.get(`/api/complaints/${cid}`)).body.priority, 'urgent');
});
