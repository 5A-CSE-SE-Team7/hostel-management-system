const test = require('node:test');
const assert = require('node:assert/strict');
if (process.env.DB_NAME !== 'hms_test') throw new Error('Use isolated hms_test');
const h = require('./helpers');
const { createDelivery } = require('../src/utils/notify');
let student, other, warden, maintenance, cid, userId, notificationId;
test.before(async () => {
  await h.resetDb(); const u = await h.mkUser('student'); userId = u.id; student = await h.login(u);
  other = await h.login(await h.mkUser('student', 2)); warden = await h.login(await h.mkUser('warden'));
  maintenance = await h.mkUser('maintenance'); const cat = await h.seedCategory();
  cid = (await student.post('/api/complaints').send({ categoryId: cat, location: 'A101', description: 'Fan broken' })).body.complaintId;
});
test.after(h.closeAll);
test('TC-Comp-04 assignment, progress and resolution persist scoped notifications', async () => {
  await warden.post(`/api/complaints/${cid}/assign`).send({ assignedTo: maintenance.id });
  await warden.patch(`/api/complaints/${cid}/status`).send({ status: 'in_progress' });
  await warden.patch(`/api/complaints/${cid}/status`).send({ status: 'resolved', resolutionDetails: 'Replaced capacitor' });
  const result = await student.get('/api/notifications'); assert.equal(result.status, 200);
  const types = result.body.map(row => row.type);
  for (const type of ['complaint_assigned', 'complaint_updated', 'complaint_resolved']) assert.ok(types.includes(type));
  assert.ok(result.body.every(row => row.refId === cid && row.deliveryStatus === 'in_app' && row.isRead === false));
  notificationId = result.body[0].id;
  assert.deepEqual((await other.get('/api/notifications')).body, []);
  assert.equal((await other.post(`/api/notifications/${notificationId}/read`)).status, 404);
  assert.equal((await h.request(h.app).get('/api/notifications')).status, 401);
});
test('email failure retries three times after initial attempt without rolling back complaint', async () => {
  let attempts = 0; const logs = [];
  const deliver = createDelivery({ database: h.pool, getTransport: () => ({ sendMail: async () => { attempts += 1; throw new Error('simulated-sensitive-SMTP-string'); } }), log: text => logs.push(text) });
  assert.equal(await deliver(notificationId), 'failed'); assert.equal(attempts, 4);
  assert.ok(logs.every(line => !line.includes('sensitive')));
  assert.equal((await student.get(`/api/complaints/${cid}`)).body.status, 'resolved');
  const [[notification]] = await h.pool.query('SELECT delivery_status FROM notifications WHERE id = ?', [notificationId]);
  assert.equal(notification.delivery_status, 'failed');
});
test('successful retry marks sent, subsequent sends skip, competing delivery locks skip', async () => {
  let sends = 0;
  const deliver = createDelivery({ database: h.pool, getTransport: () => ({ sendMail: async () => { sends += 1; } }) });
  const connection = await h.pool.getConnection();
  try {
    await connection.query('SELECT GET_LOCK(?, 0)', [`hms-notification-${notificationId}`]);
    assert.equal(await deliver(notificationId), 'busy'); assert.equal(sends, 0);
  } finally { await connection.query('SELECT RELEASE_LOCK(?)', [`hms-notification-${notificationId}`]); connection.release(); }
  assert.equal(await deliver(notificationId), 'sent'); assert.equal(await deliver(notificationId), 'sent'); assert.equal(sends, 1);
});
test('unread count/read-all are idempotent and cannot mark another user records', async () => {
  assert.equal((await student.get('/api/notifications/unread-count')).body.count, 3);
  assert.equal((await student.post(`/api/notifications/${notificationId}/read`)).status, 200);
  assert.equal((await student.get('/api/notifications/unread-count')).body.count, 2);
  await other.post('/api/notifications/read-all');
  assert.equal((await student.get('/api/notifications/unread-count')).body.count, 2);
  await student.post('/api/notifications/read-all'); await student.post('/api/notifications/read-all');
  assert.equal((await student.get('/api/notifications/unread-count')).body.count, 0);
  assert.equal((await student.get('/api/notifications?before=bad')).status, 400);
  assert.equal((await student.post('/api/notifications/nope/read')).status, 400);
});
