const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

let warden; let student; let other; let maint; let maint2; let cat; let m1;

test.before(async () => {
  await h.resetDb();
  warden = await h.login(await h.mkUser('warden'));
  student = await h.login(await h.mkUser('student', 1));
  other = await h.login(await h.mkUser('student', 2));
  m1 = await h.mkUser('maintenance', 1);
  maint = await h.login(m1);
  maint2 = await h.login(await h.mkUser('maintenance', 2));
  cat = await h.seedCategory();
});
test.after(h.closeAll);

let cid;
test('TC-Comp-01 student submits a complaint and gets a unique id; invalid input rejected', async () => {
  const r = await student.post('/api/complaints').send({ categoryId: cat, location: 'Block A 101', description: 'Fan not working' });
  assert.equal(r.status, 201); assert.equal(r.body.status, 'submitted');
  cid = r.body.complaintId;
  const r2 = await student.post('/api/complaints').send({ categoryId: cat, location: 'Block A 101', description: 'Light broken', attachmentRef: 'IMG_1' });
  assert.notEqual(r2.body.complaintId, cid);
  assert.equal((await student.post('/api/complaints').send({ categoryId: 9999, location: 'x', description: 'valid text' })).status, 400);
  assert.equal((await student.post('/api/complaints').send({ categoryId: cat })).status, 400);
  assert.equal((await other.get(`/api/complaints/${cid}`)).status, 404); // other students cannot see it
});

test('TC-Comp-02 warden assigns to maintenance staff and sets priority', async () => {
  assert.equal((await student.post(`/api/complaints/${cid}/assign`).send({ assignedTo: m1.id })).status, 403);
  assert.equal((await warden.post(`/api/complaints/${cid}/assign`).send({ assignedTo: 99999 })).status, 400);
  const ok = await warden.post(`/api/complaints/${cid}/assign`).send({ assignedTo: m1.id, priority: 'high' });
  assert.equal(ok.status, 200);
  const c = (await student.get(`/api/complaints/${cid}`)).body;
  assert.equal(c.status, 'assigned'); assert.equal(c.assignedTo, m1.id); assert.equal(c.priority, 'high');
});

test('TC-Comp-03 only the assigned staff can update; transitions are validated; resolution stored', async () => {
  assert.equal((await maint2.patch(`/api/complaints/${cid}/status`).send({ status: 'in_progress' })).status, 403);
  assert.equal((await student.patch(`/api/complaints/${cid}/status`).send({ status: 'resolved' })).status, 403);
  assert.equal((await maint.patch(`/api/complaints/${cid}/status`).send({ status: 'in_progress' })).status, 200);
  assert.equal((await maint.patch(`/api/complaints/${cid}/status`).send({ status: 'resolved' })).status, 400); // details required
  const done = await maint.patch(`/api/complaints/${cid}/status`).send({ status: 'resolved', resolutionDetails: 'Replaced capacitor' });
  assert.equal(done.status, 200);
  const c = (await student.get(`/api/complaints/${cid}`)).body;
  assert.equal(c.status, 'resolved'); assert.equal(c.resolutionDetails, 'Replaced capacitor'); assert.ok(c.resolvedAt);
  assert.equal((await warden.post(`/api/complaints/${cid}/assign`).send({ assignedTo: m1.id })).body.errorCode, 'INVALID_TRANSITION');
  assert.equal((await maint2.get('/api/complaints')).body.length, 0); // sees only own assignments
});

test('TC-Comp-04 student is notified on assignment, update and resolution', async () => {
  const types = (await student.get('/api/notifications')).body.map((n) => n.type);
  for (const t of ['complaint_assigned', 'complaint_updated', 'complaint_resolved']) assert.ok(types.includes(t), `missing ${t}`);
  assert.equal((await other.get('/api/notifications')).body.length, 0);
  assert.ok((await student.get('/api/notifications/unread-count')).body.count >= 3);
  await student.post('/api/notifications/read-all');
  assert.equal((await student.get('/api/notifications/unread-count')).body.count, 0);
});
