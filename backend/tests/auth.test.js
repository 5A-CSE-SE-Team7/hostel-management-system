const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

test.before(h.resetDb);
test.after(h.closeAll);

const registration = {
  srn: 'PES2UG24CS777',
  name: 'New Student',
  email: 'new@t.test',
  password: 'Abcdef12',
  contact: '9876543210',
};

test('TC-Auth-01 creates the student and REGISTER audit record', async () => {
  const result = await h.request(h.app).post('/api/auth/register').send(registration);
  assert.equal(result.status, 201);
  assert.equal(result.body.role, 'student');

  const [[user]] = await h.pool.query('SELECT email, name, role, password_hash FROM users WHERE id = ?', [result.body.userId]);
  const [[student]] = await h.pool.query('SELECT srn, contact FROM students WHERE user_id = ?', [result.body.userId]);
  const [[event]] = await h.pool.query("SELECT action, entity_id FROM audit_logs WHERE action = 'REGISTER'");
  assert.equal(user.email, registration.email);
  assert.equal(user.role, 'student');
  assert.notEqual(user.password_hash, registration.password);
  assert.deepEqual(student, { srn: registration.srn, contact: registration.contact });
  assert.equal(event.action, 'REGISTER');
  assert.equal(event.entity_id, String(result.body.userId));
});

test('TC-Auth-01 rejects duplicate email and duplicate SRN with distinct 409 codes', async () => {
  const emailConflict = await h.request(h.app).post('/api/auth/register').send({ ...registration, srn: 'PES2UG24CS778' });
  const srnConflict = await h.request(h.app).post('/api/auth/register').send({ ...registration, email: 'other@t.test' });
  assert.equal(emailConflict.status, 409);
  assert.equal(emailConflict.body.errorCode, 'EMAIL_EXISTS');
  assert.ok(emailConflict.body.details.email);
  assert.equal(srnConflict.status, 409);
  assert.equal(srnConflict.body.errorCode, 'SRN_EXISTS');
  assert.ok(srnConflict.body.details.srn);
});

test('TC-Auth-01 returns field details for invalid registration data', async () => {
  const result = await h.request(h.app).post('/api/auth/register').send({ ...registration, srn: 'bad-srn', email: 'invalid', password: 'short', contact: 'abc' });
  assert.equal(result.status, 400);
  assert.ok(result.body.details.srn);
  assert.ok(result.body.details.email);
  assert.ok(result.body.details.password);
  assert.ok(result.body.details.contact);
  assert.ok(result.body.requestId);
});

test('TC-Sec-02 registration enforces password length and letter-plus-digit policy', async () => {
  const invalidPasswords = ['12345678', 'abcdefgh', 'A1'.repeat(36) + 'A'];
  for (const password of invalidPasswords) {
    const result = await h.request(h.app).post('/api/auth/register').send({ ...registration, password });
    assert.equal(result.status, 400);
    assert.ok(result.body.details.password);
  }
});

test('registration enforces an optional configured institutional email domain', async () => {
  const config = require('../src/config');
  const previousDomain = config.emailDomain;
  config.emailDomain = 'university.test';
  try {
    const result = await h.request(h.app).post('/api/auth/register').send({
      ...registration,
      srn: 'PES2UG24CS779',
      email: 'student@outside.test',
    });
    assert.equal(result.status, 400);
    assert.match(result.body.details.email, /university\.test/);
  } finally {
    config.emailDomain = previousDomain;
  }
});

test('TC-Auth-02 login creates a role session, /me returns it, and logout invalidates it', async () => {
  const agent = h.request.agent(h.app);
  const login = await agent.post('/api/auth/login').send({ email: registration.email, password: registration.password });
  assert.equal(login.status, 200);
  assert.equal(login.body.role, 'student');
  assert.equal(login.body.sessionStatus, 'active');
  assert.ok(login.headers['set-cookie'].some((cookie) => cookie.includes('HttpOnly') && cookie.includes('SameSite=Lax')));
  const [[activeSession]] = await h.pool.query('SELECT COUNT(*) AS count FROM sessions');
  assert.ok(activeSession.count > 0, 'the authenticated session is stored in MySQL');

  const me = await agent.get('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.email, registration.email);
  assert.equal(me.body.role, 'student');

  const logout = await agent.post('/api/auth/logout').send({});
  assert.equal(logout.status, 200);
  assert.equal(logout.body.sessionStatus, 'ended');
  assert.equal((await agent.get('/api/auth/me')).status, 401);
  const [[endedSession]] = await h.pool.query('SELECT COUNT(*) AS count FROM sessions');
  assert.equal(endedSession.count, 0, 'logout removes the server-side session');
});

test('TC-Auth-02 unknown email and wrong password return the same 401 response', async () => {
  const wrongPassword = await h.request(h.app).post('/api/auth/login').send({ email: registration.email, password: 'WrongPass123' });
  const unknownEmail = await h.request(h.app).post('/api/auth/login').send({ email: 'unknown@t.test', password: 'WrongPass123' });
  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.equal(wrongPassword.body.errorCode, 'INVALID_CREDENTIALS');
  assert.equal(unknownEmail.body.errorCode, 'INVALID_CREDENTIALS');
  assert.equal(wrongPassword.body.message, unknownEmail.body.message);
});

test('TC-Auth-03 students can update permitted profile fields but protected fields stay unchanged', async () => {
  const agent = h.request.agent(h.app);
  const login = await agent.post('/api/auth/login').send({ email: registration.email, password: registration.password });
  assert.equal(login.status, 200);
  const before = await agent.get('/api/profile');
  assert.equal(before.status, 200);
  assert.equal(before.body.srn, registration.srn);

  const updated = await agent.put('/api/profile').send({
    name: 'Updated Student',
    contact: '9111111111',
    department: 'ECE',
    yearOfStudy: 3,
    guardianName: 'Guardian Name',
    guardianContact: '9222222222',
    address: 'New address',
    role: 'admin',
    srn: 'HACK123',
    email: 'changed@t.test',
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.name, 'Updated Student');
  assert.equal(updated.body.contact, '9111111111');
  assert.equal(updated.body.department, 'ECE');
  assert.equal(updated.body.yearOfStudy, 3);
  assert.equal(updated.body.guardianName, 'Guardian Name');
  assert.equal(updated.body.guardianContact, '9222222222');
  assert.equal(updated.body.address, 'New address');
  assert.equal(updated.body.role, 'student');
  assert.equal(updated.body.srn, registration.srn);
  assert.equal(updated.body.email, registration.email);
  assert.equal((await agent.put('/api/profile').send({ yearOfStudy: 99 })).status, 400);
});

test('TC-Auth-03 staff can search and edit student profiles; students cannot access the staff list', async () => {
  const target = await h.mkUser('student', 2);
  const warden = await h.login(await h.mkUser('warden', 1));
  const student = await h.login(target);

  assert.equal((await student.get('/api/students')).status, 403);
  const search = await warden.get('/api/students').query({ search: 'PES2UG24CS902' });
  assert.equal(search.status, 200);
  assert.equal(search.body.length, 1);
  assert.equal(search.body[0].id, target.id);

  const detail = await warden.get(`/api/students/${target.id}`);
  assert.equal(detail.status, 200);
  const updated = await warden.put(`/api/students/${target.id}`).send({
    name: 'Staff Updated', department: 'CSE', role: 'admin', srn: 'CHANGED123', email: 'changed@t.test',
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.name, 'Staff Updated');
  assert.equal(updated.body.department, 'CSE');
  assert.equal(updated.body.role, 'student');
  assert.equal(updated.body.srn, 'PES2UG24CS902');
  assert.equal(updated.body.email, target.email);
});

test('TC-Auth-04 admin manages staff roles, prevents self-lockout, invalidates stale sessions, and audits changes', async () => {
  const adminUser = await h.mkUser('admin', 9);
  const admin = await h.login(adminUser);
  const weakPassword = await admin.post('/api/admin/users').send({
    name: 'Weak Password User', email: 'weak-password@t.test', password: 'onlyletters', role: 'warden',
  });
  assert.equal(weakPassword.status, 400);
  assert.ok(weakPassword.body.details.password);

  const created = await admin.post('/api/admin/users').send({
    name: 'Warden Two',
    email: 'warden2@t.test',
    password: 'Warden123',
    role: 'warden',
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.role, 'warden');
  assert.equal('password_hash' in created.body, false);

  const warden = h.request.agent(h.app);
  const loggedIn = await warden.post('/api/auth/login').send({ email: 'warden2@t.test', password: 'Warden123' });
  assert.equal(loggedIn.status, 200);

  const changed = await admin.patch(`/api/admin/users/${created.body.id}`).send({ role: 'maintenance' });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.role, 'maintenance');
  assert.equal((await warden.get('/api/auth/me')).status, 401, 'changing a role invalidates old sessions');

  const deactivated = await admin.patch(`/api/admin/users/${created.body.id}`).send({ isActive: false });
  assert.equal(deactivated.status, 200);
  assert.equal(deactivated.body.isActive, false);
  const activated = await admin.patch(`/api/admin/users/${created.body.id}`).send({ isActive: true });
  assert.equal(activated.status, 200);
  assert.equal(activated.body.isActive, true);

  const [[events]] = await h.pool.query(
    "SELECT GROUP_CONCAT(action ORDER BY id) AS actions FROM audit_logs WHERE entity_id = ?",
    [String(created.body.id)],
  );
  assert.match(events.actions, /ROLE_ASSIGNED/);
  assert.match(events.actions, /ROLE_CHANGED/);
  assert.match(events.actions, /USER_DEACTIVATED/);
  assert.match(events.actions, /USER_ACTIVATED/);

  const selfRole = await admin.patch(`/api/admin/users/${adminUser.id}`).send({ role: 'warden' });
  const selfDeactivate = await admin.patch(`/api/admin/users/${adminUser.id}`).send({ isActive: false });
  assert.equal(selfRole.body.errorCode, 'SELF_LOCKOUT');
  assert.equal(selfDeactivate.body.errorCode, 'SELF_LOCKOUT');
  assert.equal((await admin.get('/api/auth/me')).status, 200);
});

test('TC-Auth-04 admin endpoints return 401 when signed out and 403 for non-admin roles', async () => {
  assert.equal((await h.request(h.app).get('/api/admin/users')).status, 401);
  const student = await h.login(await h.mkUser('student', 3));
  const warden = await h.login(await h.mkUser('warden', 3));
  assert.equal((await student.get('/api/admin/users')).status, 403);
  assert.equal((await warden.post('/api/admin/users').send({})).status, 403);
});

test('TC-Sec-02 every stored password is a unique bcrypt hash, never a known plaintext', async () => {
  const { bcryptRounds } = require('../src/config');
  const knownPlaintextPasswords = new Set([registration.password, h.PASSWORD, 'Warden123']);
  const [users] = await h.pool.query('SELECT password_hash FROM users');
  const hashes = users.map((user) => user.password_hash);
  assert.ok(hashes.length > 0);
  for (const hash of hashes) {
    assert.match(hash, /^\$2[aby]\$\d{2}\$/);
    assert.equal(Number(hash.slice(4, 6)), bcryptRounds);
    assert.equal(knownPlaintextPasswords.has(hash), false);
  }
  assert.equal(new Set(hashes).size, hashes.length, 'bcrypt hashes must be uniquely salted');
});
