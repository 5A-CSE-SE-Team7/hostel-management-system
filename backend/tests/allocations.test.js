// Integration coverage for HMS-F-006/007 (uses the isolated hms_test database).
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

test('allocation transfer is atomic, keeps history, and rejects unavailable targets (TC-Room-03)', async () => {
  await resetDb();
  const app = createTestApp();
  const warden = userClient(app, await mkUser('warden', 1));
  const student = await mkUser('student', 1);
  const otherStudent = await mkUser('student', 2);
  const studentClient = userClient(app, student);
  const { bedIds } = await mkInventory(warden, 4, 'transfer');

  const original = await warden.post('/api/allocations').send({ studentId: student.id, bedId: bedIds[0] });
  assert.equal(original.status, 201);
  assert.equal((await warden.post('/api/allocations').send({ studentId: otherStudent.id, bedId: bedIds[1] })).status, 201);

  assert.equal((await studentClient.post(`/api/allocations/${original.body.id}/transfer`)
    .send({ targetBedId: bedIds[3] })).status, 403);

  const occupiedTransfer = await warden.post(`/api/allocations/${original.body.id}/transfer`)
    .send({ targetBedId: bedIds[1] });
  assert.equal(occupiedTransfer.status, 409);
  assert.equal(occupiedTransfer.body.errorCode, 'OCCUPIED');

  await warden.patch(`/api/beds/${bedIds[2]}`).send({ isActive: false });
  const inactiveTransfer = await warden.post(`/api/allocations/${original.body.id}/transfer`)
    .send({ targetBedId: bedIds[2] });
  assert.equal(inactiveTransfer.status, 409);
  assert.equal(inactiveTransfer.body.errorCode, 'INACTIVE_BED');

  const [[unchanged]] = await pool.query(
    'SELECT id, bed_id, status, released_at FROM allocations WHERE id = ?', [original.body.id]
  );
  assert.equal(unchanged.bed_id, bedIds[0]);
  assert.equal(unchanged.status, 'allocated');
  assert.equal(unchanged.released_at, null);

  const transfer = await warden.post(`/api/allocations/${original.body.id}/transfer`)
    .send({ targetBedId: bedIds[3] });
  assert.equal(transfer.status, 200);
  assert.equal(transfer.body.previousAllocationId, original.body.id);
  assert.equal(transfer.body.previousBedId, bedIds[0]);
  assert.equal(transfer.body.bedId, bedIds[3]);

  const [history] = await pool.query(
    'SELECT id, bed_id, status, released_at FROM allocations WHERE student_id = ? ORDER BY id', [student.id]
  );
  assert.equal(history.length, 2);
  assert.equal(history[0].status, 'transferred');
  assert.ok(history[0].released_at);
  assert.equal(history[1].id, transfer.body.allocationId);
  assert.equal(history[1].bed_id, bedIds[3]);
  assert.equal(history[1].status, 'allocated');
  assert.equal(history[1].released_at, null);

  const [[{ total: notificationCount }]] = await pool.query(
    "SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND type = 'allocation_transfer'", [student.id]
  );
  const [[{ total: auditCount }]] = await pool.query(
    "SELECT COUNT(*) AS total FROM audit_logs WHERE action = 'ALLOCATION_TRANSFER' AND entity_id = ?",
    [String(transfer.body.allocationId)]
  );
  assert.equal(Number(notificationCount), 1);
  assert.equal(Number(auditCount), 1);

  const active = await warden.get('/api/allocations');
  assert.equal(active.status, 200);
  assert.equal(active.body.some((allocation) => allocation.id === original.body.id), false);
  assert.equal(active.body.some((allocation) => allocation.id === transfer.body.allocationId), true);
});

test('check-in/out validates state and dates while preserving occupancy history (TC-Room-04)', async () => {
  await resetDb();
  const app = createTestApp();
  const warden = userClient(app, await mkUser('warden', 1));
  const student = await mkUser('student', 1);
  const studentClient = userClient(app, student);
  const { bedIds } = await mkInventory(warden, 2, 'checkin');
  const allocation = await warden.post('/api/allocations').send({ studentId: student.id, bedId: bedIds[0] });
  assert.equal(allocation.status, 201);

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const checkOutBeforeCheckIn = await warden.post(`/api/allocations/${allocation.body.id}/check-out`).send({ checkOutDate: today });
  assert.equal(checkOutBeforeCheckIn.status, 409);
  assert.equal(checkOutBeforeCheckIn.body.errorCode, 'NOT_CHECKED_IN');

  const beforeAllocation = await warden.post(`/api/allocations/${allocation.body.id}/check-in`).send({ checkInDate: '2000-01-01' });
  assert.equal(beforeAllocation.status, 400);
  const invalidCalendarDate = await warden.post(`/api/allocations/${allocation.body.id}/check-in`).send({ checkInDate: '2026-02-31' });
  assert.equal(invalidCalendarDate.status, 400);
  const futureCheckIn = await warden.post(`/api/allocations/${allocation.body.id}/check-in`).send({ checkInDate: tomorrow });
  assert.equal(futureCheckIn.status, 400);

  const checkIn = await warden.post(`/api/allocations/${allocation.body.id}/check-in`).send({ checkInDate: today });
  assert.equal(checkIn.status, 200);
  assert.equal(checkIn.body.status, 'checked_in');
  assert.equal(checkIn.body.checkInDate, today);
  assert.equal((await warden.get('/api/occupancy')).body.occupiedBeds, 1);
  const duplicateCheckIn = await warden.post(`/api/allocations/${allocation.body.id}/check-in`).send({ checkInDate: today });
  assert.equal(duplicateCheckIn.status, 409);
  assert.equal(duplicateCheckIn.body.errorCode, 'ALREADY_CHECKED_IN');

  const studentRoom = await studentClient.get('/api/me/room');
  assert.equal(studentRoom.status, 200);
  assert.equal(studentRoom.body.allocation.status, 'checked_in');
  assert.equal(studentRoom.body.history[0].checkInDate, today);

  const earlyCheckOut = await warden.post(`/api/allocations/${allocation.body.id}/check-out`).send({ checkOutDate: yesterday });
  assert.equal(earlyCheckOut.status, 400);
  const checkOut = await warden.post(`/api/allocations/${allocation.body.id}/check-out`).send({ checkOutDate: today });
  assert.equal(checkOut.status, 200);
  assert.equal(checkOut.body.status, 'checked_out');
  assert.equal(checkOut.body.checkOutDate, today);
  assert.equal((await warden.get('/api/occupancy')).body.occupiedBeds, 0);
  const duplicateCheckOut = await warden.post(`/api/allocations/${allocation.body.id}/check-out`).send({ checkOutDate: today });
  assert.equal(duplicateCheckOut.status, 409);

  const available = await warden.get('/api/beds/available');
  assert.equal(available.body.some((bed) => bed.id === bedIds[0]), true);
  const currentAllocations = await warden.get('/api/allocations');
  assert.equal(currentAllocations.body.some((row) => row.id === allocation.body.id), false);
  const staffHistory = await warden.get('/api/allocations/history');
  const historyRow = staffHistory.body.find((row) => row.id === allocation.body.id);
  assert.equal(historyRow.status, 'checked_out');
  assert.equal(historyRow.checkInDate, today);
  assert.equal(historyRow.checkOutDate, today);

  const studentHistory = await studentClient.get('/api/me/room');
  assert.equal(studentHistory.body.allocation, null);
  assert.equal(studentHistory.body.history[0].status, 'checked_out');
  assert.equal((await studentClient.get('/api/allocations/history')).status, 403);

  const [[{ total: checkInEvents }]] = await pool.query(
    "SELECT COUNT(*) AS total FROM audit_logs WHERE action = 'ALLOCATION_CHECK_IN' AND entity_id = ?",
    [String(allocation.body.id)]
  );
  const [[{ total: checkOutEvents }]] = await pool.query(
    "SELECT COUNT(*) AS total FROM audit_logs WHERE action = 'ALLOCATION_CHECK_OUT' AND entity_id = ?",
    [String(allocation.body.id)]
  );
  assert.equal(Number(checkInEvents), 1);
  assert.equal(Number(checkOutEvents), 1);
});

test.after(async () => {
  await closeAll();
});
