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
