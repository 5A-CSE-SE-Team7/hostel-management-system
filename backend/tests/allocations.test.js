// Integration coverage for HMS-F-006 (uses the isolated hms_test database).
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'hms_test';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const {
  pool, resetDb, mkUser, mkInventory, closeAll,
} = require('./helpers');
const inventoryRouter = require('../src/routes/inventory');
const allocationsRouter = require('../src/routes/allocations');
const common = require('../src/middleware/common');

function createTestApp() {
  const app = express();
  app.use(express.json());
  // Exercise route authorization without depending on the separate login module.
  app.use((req, _res, next) => {
    const role = req.get('x-test-role');
    if (role) req.session = { user: { id: Number(req.get('x-test-user-id')), role } };
    next();
  });
  app.use('/api', inventoryRouter);
  app.use('/api', allocationsRouter);
  app.use(common.errorHandler);
  return app;
}

function userClient(app, user) {
  const send = (method, path) => {
    const req = request(app)[method](path);
    if (user) req.set('x-test-role', user.role).set('x-test-user-id', String(user.id));
    return req;
  };
  return {
    get: (path) => send('get', path),
    post: (path) => send('post', path),
    patch: (path) => send('patch', path),
  };
}

test('allocations enforce eligibility, audit, notify, and serialize concurrent requests (TC-Room-02)', async () => {
  await resetDb();
  const app = createTestApp();
  const wardenUser = await mkUser('warden', 1);
  const student = await mkUser('student', 1);
  const warden = userClient(app, wardenUser);
  const studentClient = userClient(app, student);
  const anonymous = userClient(app, null);

  assert.equal((await anonymous.get('/api/beds/available')).status, 401);
  assert.equal((await studentClient.post('/api/allocations').send({ studentId: student.id, bedId: 1 })).status, 403);

  const { bedIds } = await mkInventory(warden, 2, 'alloc');
  const bedId = bedIds[0];
  const [availableBefore] = await Promise.all([
    warden.get('/api/beds/available'),
  ]);
  assert.equal(availableBefore.status, 200);
  assert.equal(availableBefore.body.some((bed) => bed.id === bedId), true);

  const attempts = await Promise.all(Array.from({ length: 6 }, () =>
    warden.post('/api/allocations').send({ studentId: student.id, bedId })
  ));
  assert.equal(attempts.filter((response) => response.status === 201).length, 1);
  assert.equal(attempts.filter((response) => response.status === 409).length, 5);
  assert.equal(attempts.every((response) => [201, 409].includes(response.status)), true);

  const [[{ total: allocationCount }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM allocations WHERE bed_id = ? AND released_at IS NULL', [bedId]
  );
  const [[{ total: notificationCount }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM notifications
      WHERE user_id = ? AND type = 'allocation'`, [student.id]
  );
  const [[{ total: auditCount }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM audit_logs
      WHERE action = 'ALLOCATION_CREATE' AND entity_id = ?`, [String(attempts.find((response) => response.status === 201).body.id)]
  );
  assert.equal(Number(allocationCount), 1);
  assert.equal(Number(notificationCount), 1);
  assert.equal(Number(auditCount), 1);

  const availableAfter = await warden.get('/api/beds/available');
  assert.equal(availableAfter.body.some((bed) => bed.id === bedId), false);
  const occupancy = await warden.get('/api/occupancy');
  assert.equal(occupancy.body.occupiedBeds, 1);
  assert.equal(occupancy.body.availableBeds, 1);

  const myRoom = await studentClient.get('/api/me/room');
  assert.equal(myRoom.status, 200);
  assert.equal(myRoom.body.allocation.bed.id, bedId);

  const inactiveBedId = bedIds[1];
  assert.equal((await warden.patch(`/api/beds/${inactiveBedId}`).send({ isActive: false })).status, 200);
  const inactiveAllocation = await warden.post('/api/allocations')
    .send({ studentId: student.id, bedId: inactiveBedId });
  assert.equal(inactiveAllocation.status, 409);
  assert.equal(inactiveAllocation.body.errorCode, 'INACTIVE_BED');
});

test.after(async () => {
  await closeAll();
});
