const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

test.before(h.resetDb);
test.after(h.closeAll);

const reg = { srn: 'PES2UG24CS777', name: 'New Student', email: 'new@t.test', password: 'Abcdef12', contact: '9876543210' };

test('TC-Auth-01 registers a student with required details; rejects duplicates and bad input', async () => {
  const ok = await h.request(h.app).post('/api/auth/register').send(reg);
  assert.equal(ok.status, 201);
  assert.equal(ok.body.role, 'student');
  assert.equal((await h.request(h.app).post('/api/auth/register').send(reg)).status, 409);
  assert.equal((await h.request(h.app).post('/api/auth/register').send({ ...reg, email: 'other@t.test' })).body.errorCode, 'SRN_EXISTS');
  const bad = await h.request(h.app).post('/api/auth/register').send({ ...reg, email: 'nope', password: 'short' });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.details.email && bad.body.details.password && bad.body.requestId);
});

test('TC-Auth-02 login creates a role-based session; wrong credentials give 401 without enumeration', async () => {
  const agent = h.request.agent(h.app);
  const res = await agent.post('/api/auth/login').send({ email: 'new@t.test', password: 'Abcdef12' });
  assert.equal(res.status, 200);
  assert.equal(res.body.role, 'student');
  assert.equal((await agent.get('/api/auth/me')).body.email, 'new@t.test');
  const a = await h.request(h.app).post('/api/auth/login').send({ email: 'new@t.test', password: 'wrong-pass1' });
  const b = await h.request(h.app).post('/api/auth/login').send({ email: 'ghost@t.test', password: 'wrong-pass1' });
  assert.equal(a.status, 401); assert.equal(b.status, 401);
  assert.equal(a.body.message, b.body.message);
  await agent.post('/api/auth/logout');
  assert.equal((await agent.get('/api/auth/me')).status, 401);
});

test('TC-Auth-03 profile: permitted fields persist, protected fields (srn/email/role) are ignored', async () => {
  const agent = h.request.agent(h.app);
  await agent.post('/api/auth/login').send({ email: 'new@t.test', password: 'Abcdef12' });
  const upd = await agent.put('/api/profile').send({ contact: '9111111111', department: 'ECE', yearOfStudy: 3, role: 'admin', srn: 'HACK123', email: 'x@y.com' });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.department, 'ECE');
  assert.equal(upd.body.role, 'student');
  assert.equal(upd.body.srn, 'PES2UG24CS777');
  assert.equal(upd.body.email, 'new@t.test');
  assert.equal((await agent.put('/api/profile').send({ yearOfStudy: 99 })).status, 400);
});

test('TC-Auth-04 / TC-Sec-03 RBAC: every role is limited to its own functions', async () => {
  const student = await h.login(await h.mkUser('student', 1));
  const maint = await h.login(await h.mkUser('maintenance', 1));
  const warden = await h.login(await h.mkUser('warden', 1));
  assert.equal((await h.request(h.app).get('/api/students')).status, 401);
  assert.equal((await student.get('/api/students')).status, 403);
  assert.equal((await student.get('/api/admin/users')).status, 403);
  assert.equal((await student.post('/api/blocks').send({ name: 'X' })).status, 403);
  assert.equal((await maint.get('/api/inventory')).status, 403);
  assert.equal((await maint.get('/api/reports/occupancy')).status, 403);
  assert.equal((await warden.get('/api/admin/users')).status, 403);
  assert.equal((await warden.get('/api/students')).status, 200);
});

test('TC-Sec-02 passwords are stored only as salted one-way bcrypt hashes', async () => {
  const [rows] = await h.pool.query('SELECT password_hash FROM users');
  assert.ok(rows.length > 0);
  for (const r of rows) {
    assert.match(r.password_hash, /^\$2[aby]\$\d{2}\$/);
    assert.ok(!['Abcdef12', h.PASSWORD].includes(r.password_hash));
  }
  assert.equal(new Set(rows.map((r) => r.password_hash)).size, rows.length, 'hashes must be salted/unique');
});

test('HMS-F-004 admin manages roles; changes are audited; cannot lock itself out', async () => {
  const adminU = await h.mkUser('admin', 1);
  const admin = await h.login(adminU);
  const created = await admin.post('/api/admin/users').send({ name: 'W Two', email: 'w2@t.test', password: 'Warden123', role: 'warden' });
  assert.equal(created.status, 201);
  assert.equal((await admin.patch(`/api/admin/users/${created.body.id}`).send({ role: 'maintenance' })).status, 200);
  assert.equal((await admin.patch(`/api/admin/users/${adminU.id}`).send({ isActive: false })).body.errorCode, 'SELF_LOCKOUT');
  const log = await admin.get('/api/admin/audit?action=ROLE_CHANGED');
  assert.ok(log.body.length >= 1);
});
