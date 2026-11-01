// TC-Comp-01, real M1 session and M2 audit integration; isolated hms_test only.
const test = require('node:test');
const assert = require('node:assert/strict');
if (process.env.DB_NAME !== 'hms_test') throw new Error('Run complaint integration only with DB_NAME=hms_test');
const h = require('./helpers');
const { verifyChain } = require('../src/utils/audit');
let student, other, warden, maint, admin, category, inactive, studentUser;
let submitted;
test.before(async () => {
  await h.resetDb();
  studentUser = await h.mkUser('student', 1);
  student = await h.login(studentUser);
  other = await h.login(await h.mkUser('student', 2));
  warden = await h.login(await h.mkUser('warden'));
  maint = await h.login(await h.mkUser('maintenance'));
  admin = await h.login(await h.mkUser('admin'));
  category = await h.seedCategory('Electrical');
  inactive = await h.seedCategory('Inactive');
  await h.pool.query('UPDATE complaint_categories SET is_active = 0 WHERE id = ?', [inactive]);
});
test.after(h.closeAll);
test('TC-Comp-01 unauthenticated reads and creation are denied', async () => {
  for (const url of ['/api/complaints', '/api/complaint-categories', '/api/complaints/1']) assert.equal((await h.request(h.app).get(url)).status, 401);
  assert.equal((await h.request(h.app).post('/api/complaints').send({})).status, 401);
});
test('only active categories are returned', async () => {
  const response = await student.get('/api/complaint-categories');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, [{ id: category, name: 'Electrical' }]);
});
test('only students submit; valid submissions have unique ids and audited ownership', async () => {
  const body = { categoryId: category, location: ' Block A 101 ', description: 'Fan not working', attachmentRef: 'photo-123', studentId: 999, priority: 'urgent', status: 'resolved' };
  for (const actor of [warden, maint, admin]) assert.equal((await actor.post('/api/complaints').send(body)).status, 403);
  const first = await student.post('/api/complaints').send(body);
  const second = await student.post('/api/complaints').send({ category: 'Electrical', location: 'A101', description: 'Light not working' });
  assert.equal(first.status, 201); assert.equal(second.status, 201);
  assert.equal(first.body.status, 'submitted');
  assert.notEqual(first.body.complaintId, second.body.complaintId); submitted = first.body.complaintId;
  const detail = await student.get(`/api/complaints/${submitted}`);
  assert.equal(detail.body.studentId, studentUser.id);
  assert.equal(detail.body.location, 'Block A 101'); assert.equal(detail.body.attachmentRef, 'photo-123');
  assert.equal(detail.body.priority, 'medium'); assert.equal(detail.body.status, 'submitted');
  const [[audit]] = await h.pool.query("SELECT user_id, entity_id FROM audit_logs WHERE action = 'COMPLAINT_CREATE' ORDER BY id DESC LIMIT 1");
  assert.equal(audit.user_id, studentUser.id); assert.equal(Number(audit.entity_id), second.body.complaintId);
  assert.equal((await verifyChain()).valid, true);
});
test('invalid/missing fields, inactive/unknown categories and malformed ids return 400', async () => {
  const valid = { categoryId: category, location: 'A101', description: 'Fan not working' };
  const invalid = [{}, { ...valid, categoryId: inactive }, { ...valid, categoryId: 4294967295 },
    { ...valid, categoryId: true }, { ...valid, categoryId: [category] }, { ...valid, categoryId: '1 OR 1=1' },
    { ...valid, categoryId: undefined, category: 'Unknown' }, { ...valid, category: 'Different' },
    { ...valid, location: ' '.repeat(3) }, { ...valid, location: 'x'.repeat(121) },
    { ...valid, description: 'tiny' }, { ...valid, description: 'x'.repeat(2001) },
    { ...valid, attachmentRef: 'x'.repeat(301) }];
  for (const body of invalid) {
    const response = await student.post('/api/complaints').send(body);
    assert.equal(response.status, 400, JSON.stringify(body)); assert.equal(response.body.errorCode, 'VALIDATION_ERROR');
    assert.ok(response.body.requestId); assert.ok(response.body.details);
  }
});
test('students cannot enumerate others; maintenance only sees assigned complaints', async () => {
  assert.equal((await other.get(`/api/complaints/${submitted}`)).status, 404);
  assert.deepEqual((await other.get('/api/complaints')).body, []);
  assert.deepEqual((await maint.get('/api/complaints')).body, []);
  assert.equal((await maint.get(`/api/complaints/${submitted}`)).status, 404);
  for (const actor of [warden, admin]) assert.equal((await actor.get('/api/complaints')).body.length, 2);
});
test('bounded pagination and validated filters retain ownership scoping', async () => {
  const page = await student.get('/api/complaints?limit=1');
  assert.equal(page.status, 200); assert.equal(page.body.length, 1);
  const next = await student.get(`/api/complaints?limit=1&before=${page.body[0].id}`);
  assert.equal(next.body[0].id, submitted);
  assert.deepEqual((await student.get('/api/complaints?status=resolved')).body, []);
  for (const query of ['status=invalid', 'status=submitted&status=resolved', 'limit=501', 'before=-1', 'limit=true']) assert.equal((await student.get(`/api/complaints?${query}`)).status, 400);
  assert.equal((await student.get('/api/complaints/nope')).status, 400);
});
test('audit failure rolls back creation rather than returning unaudited success', async () => {
  const [[head]] = await h.pool.query('SELECT last_hash FROM audit_head WHERE id = 1');
  const [[before]] = await h.pool.query('SELECT COUNT(*) AS count FROM complaints');
  await h.pool.query('DELETE FROM audit_head WHERE id = 1');
  try {
    assert.equal((await student.post('/api/complaints').send({ categoryId: category, location: 'A101', description: 'Fault simulation' })).status, 500);
    const [[after]] = await h.pool.query('SELECT COUNT(*) AS count FROM complaints');
    assert.equal(after.count, before.count);
  } finally { await h.pool.query('INSERT INTO audit_head (id, last_hash) VALUES (1, ?)', [head.last_hash]); }
});
