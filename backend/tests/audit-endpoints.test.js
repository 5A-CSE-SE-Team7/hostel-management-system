// Integration coverage for the audit endpoints (uses the isolated hms_test DB).
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'hms_test';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { pool } = require('../src/db');
const { audit } = require('../src/utils/audit');
const adminRouter = require('../src/routes/admin');
const common = require('../src/middleware/common');
const { resetDb, closeAll } = require('./helpers');

function createTestApp() {
  const app = express();
  // Set a session role in the test harness so these checks do not depend on
  // the separate authentication module's login workflow.
  app.use((req, _res, next) => {
    const role = req.get('x-test-role');
    if (role) req.session = { user: { id: 1, role } };
    next();
  });
  app.use('/api/admin', adminRouter);
  app.use(common.errorHandler);
  return app;
}

test('admin audit endpoints authorize, list, verify, and detect row tampering', async () => {
  await resetDb();
  const app = createTestApp();
  const adminGet = (path) => request(app).get(path).set('x-test-role', 'admin');
  const studentGet = (path) => request(app).get(path).set('x-test-role', 'student');

  const unauthenticated = await request(app).get('/api/admin/audit');
  assert.equal(unauthenticated.status, 401);
  const forbidden = await studentGet('/api/admin/audit');
  assert.equal(forbidden.status, 403);

  const first = await audit({
    user_id: 1, role: 'admin', action: 'USER_CREATED', entity: 'user', entity_id: 1,
    details: { email: 'student@example.test' }, ip: '127.0.0.1',
  });
  await audit({
    user_id: 1, role: 'admin', action: 'BED_ALLOCATED', entity: 'allocation', entity_id: 8,
    details: { bedId: 8 }, ip: '127.0.0.1',
  });

  const listing = await adminGet('/api/admin/audit?page=1&pageSize=1');
  assert.equal(listing.status, 200);
  assert.equal(listing.body.total, 2);
  assert.equal(listing.body.items.length, 1);
  assert.equal(listing.body.items[0].action, 'BED_ALLOCATED');

  const valid = await adminGet('/api/admin/audit/verify');
  assert.equal(valid.status, 200);
  assert.deepEqual(valid.body, { valid: true, checked: 2 });

  await pool.query('UPDATE audit_logs SET details = ? WHERE id = ?', ['{"email":"changed@example.test"}', first.id]);
  const tampered = await adminGet('/api/admin/audit/verify');
  assert.equal(tampered.status, 200);
  assert.equal(tampered.body.valid, false);
  assert.equal(String(tampered.body.firstInvalidId), String(first.id));
});

test.after(async () => {
  await closeAll();
});
