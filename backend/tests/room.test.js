// Integration coverage for HMS-F-005 (uses the isolated hms_test database).
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'hms_test';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { pool, resetDb, mkUser, closeAll } = require('./helpers');
const inventoryRouter = require('../src/routes/inventory');
const common = require('../src/middleware/common');

function createTestApp() {
  const app = express();
  app.use(express.json());
  // Keep this route test independent of the separate authentication module.
  app.use((req, _res, next) => {
    const role = req.get('x-test-role');
    if (role) req.session = { user: { id: 1, role } };
    next();
  });
  app.use('/api', inventoryRouter);
  app.use(common.errorHandler);
  return app;
}

function roleClient(app, role) {
  const send = (method, path) => {
    const req = request(app)[method](path);
    return role ? req.set('x-test-role', role) : req;
  };
  return {
    get: (path) => send('get', path),
    post: (path) => send('post', path),
    patch: (path) => send('patch', path),
  };
}

test('inventory CRUD, occupancy protection, and cascading deactivation (TC-Room-01)', async () => {
  await resetDb();
  const app = createTestApp();
  const admin = roleClient(app, 'admin');
  const warden = roleClient(app, 'warden');
  const student = roleClient(app, 'student');
  const anonymous = roleClient(app, null);

  assert.equal((await anonymous.get('/api/inventory')).status, 401);
  assert.equal((await student.get('/api/inventory')).status, 403);

  const blockResponse = await warden.post('/api/blocks').send({ name: 'North' });
  assert.equal(blockResponse.status, 201);
  const blockId = blockResponse.body.id;
  assert.equal((await admin.post('/api/blocks').send({ name: 'North' })).status, 409);

  const roomResponse = await warden.post('/api/rooms').send({ blockId, roomNumber: '101', floor: 1 });
  assert.equal(roomResponse.status, 201);
  const roomId = roomResponse.body.id;
  assert.equal((await admin.post('/api/rooms').send({ blockId, roomNumber: '101', floor: 1 })).status, 409);

  const bedResponse = await warden.post('/api/beds').send({ roomId, label: 'A' });
  assert.equal(bedResponse.status, 201);
  const bedId = bedResponse.body.id;
  assert.equal((await admin.post('/api/beds').send({ roomId, label: 'A' })).status, 409);

  assert.equal((await warden.patch(`/api/blocks/${blockId}`).send({ name: 'North Hall' })).status, 200);
  assert.equal((await warden.patch(`/api/rooms/${roomId}`).send({ floor: 2 })).body.floor, 2);
  assert.equal((await warden.patch(`/api/beds/${bedId}`).send({ label: 'B' })).body.label, 'B');

  const studentUser = await mkUser('student', 1);
  await pool.query('INSERT INTO allocations (student_id, bed_id, allocated_by) VALUES (?, ?, ?)', [studentUser.id, bedId, 1]);

  const treeResponse = await warden.get('/api/inventory');
  assert.equal(treeResponse.status, 200);
  const north = treeResponse.body.find((item) => item.id === blockId);
  assert.equal(north.name, 'North Hall');
  assert.equal(north.rooms[0].beds[0].occupied, true);

  for (const [url, body] of [
    [`/api/beds/${bedId}`, { isActive: false }],
    [`/api/rooms/${roomId}`, { isActive: false }],
    [`/api/blocks/${blockId}`, { isActive: false }],
  ]) {
    const response = await warden.patch(url).send(body);
    assert.equal(response.status, 409);
    assert.equal(response.body.errorCode, 'OCCUPIED');
  }

  const secondBlock = (await warden.post('/api/blocks').send({ name: 'South' })).body;
  const secondRoom = (await warden.post('/api/rooms').send({ blockId: secondBlock.id, roomNumber: '201' })).body;
  const secondBed = (await warden.post('/api/beds').send({ roomId: secondRoom.id, label: '1' })).body;
  const deactivated = await warden.patch(`/api/blocks/${secondBlock.id}`).send({ isActive: false });
  assert.equal(deactivated.status, 200);
  const updatedTree = await warden.get('/api/inventory');
  const south = updatedTree.body.find((item) => item.id === secondBlock.id);
  assert.equal(south.isActive, false);
  assert.equal(south.rooms[0].isActive, false);
  assert.equal(south.rooms[0].beds[0].isActive, false);
  assert.equal(secondBed.isActive, true);
});

test.after(async () => {
  await closeAll();
});
