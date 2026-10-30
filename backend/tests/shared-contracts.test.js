const test = require('node:test');
const assert = require('node:assert/strict');
if (process.env.DB_NAME !== 'hms_test') throw new Error('Use isolated hms_test');
const h = require('./helpers');
const { STAFF, requireRole } = require('../src/middleware/auth');
let admin, warden, student, maintenance, studentUser;
test.before(async () => {
  await h.resetDb();
  admin = await h.login(await h.mkUser('admin'));
  warden = await h.login(await h.mkUser('warden'));
  studentUser = await h.mkUser('student'); student = await h.login(studentUser);
  maintenance = await h.login(await h.mkUser('maintenance'));
});
test.after(h.closeAll);
test('shared STAFF contract permits only warden/admin and preserves 401/403', () => {
  assert.deepEqual(STAFF, ['warden', 'admin']);
  const check = session => { let error; requireRole(...STAFF)({ session }, {}, e => { error = e; }); return error; };
  assert.equal(check(undefined).status, 401);
  for (const role of ['student', 'maintenance']) assert.equal(check({ user: { role } }).status, 403);
  for (const role of STAFF) assert.equal(check({ user: { role } }), undefined);
});
test('authorized student detail reads record the real audit event; denied reads do not', async () => {
  assert.equal((await student.get(`/api/students/${studentUser.id}`)).status, 403);
  assert.equal((await warden.get(`/api/students/${studentUser.id}`)).status, 200);
  const log = await admin.get(`/api/admin/audit?action=STUDENT_RECORD_VIEW&userId=${(await warden.get('/api/auth/me')).body.id}`);
  assert.equal(log.status, 200); assert.equal(log.body.length, 1);
  assert.equal(log.body[0].role, 'warden'); assert.equal(log.body[0].entityId, String(studentUser.id)); assert.ok(log.body[0].createdAt);
});
test('audit API is admin-only and validates parameterized bounded filters', async () => {
  for (const route of ['/api/admin/audit', '/api/admin/audit/verify']) {
    assert.equal((await h.request(h.app).get(route)).status, 401);
    for (const agent of [student, warden, maintenance]) assert.equal((await agent.get(route)).status, 403);
  }
  for (const limit of ['-1', '0', '501', '1.5', 'NaN']) assert.equal((await admin.get(`/api/admin/audit?limit=${limit}`)).status, 400);
  const rows = await admin.get('/api/admin/audit?limit=2'); assert.equal(rows.status, 200); assert.equal(rows.body.length, 2);
  const injection = await admin.get('/api/admin/audit').query({ action: "' OR 1=1 --" }); assert.equal(injection.status, 200); assert.deepEqual(injection.body, []);
  assert.equal((await admin.get('/api/admin/audit/verify')).body.valid, true);
});
test('verify endpoint uses real hash-chain checks and detects SQL tampering', async () => {
  await h.pool.query("UPDATE audit_logs SET action='TAMPERED' WHERE id=(SELECT id FROM (SELECT MIN(id) id FROM audit_logs) x)");
  const result = await admin.get('/api/admin/audit/verify'); assert.equal(result.status, 200); assert.equal(result.body.valid, false);
});
