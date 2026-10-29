const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

let warden; let student; let admin; let s;

test.before(async () => {
  await h.resetDb();
  warden = await h.login(await h.mkUser('warden'));
  admin = await h.login(await h.mkUser('admin'));
  s = await h.mkUser('student', 1);
  student = await h.login(s);
});
test.after(h.closeAll);

test('TC-Admin-01 fee ledger totals match assessments and payments', async () => {
  const a = await warden.post('/api/fees/assessments').send({ studentId: s.id, description: 'Term 1 hostel fee', amount: 50000.5, dueDate: '2026-11-01' });
  assert.equal(a.status, 201);
  await warden.post('/api/fees/assessments').send({ studentId: s.id, description: 'Mess advance', amount: 10000, dueDate: '2026-11-15' });
  assert.equal((await warden.post('/api/fees/payments').send({ studentId: s.id, assessmentId: a.body.id, amount: 20000.25, paidOn: '2026-10-20', reference: 'REC-1' })).status, 201);
  const l = (await student.get('/api/fees/me')).body;
  assert.deepEqual(l.totals, { assessed: 60000.5, paid: 20000.25, outstanding: 40000.25 });
  assert.equal(l.assessments.find((x) => x.id === a.body.id).outstanding, 30000.25);
  assert.equal((await warden.get(`/api/fees/ledger/${s.id}`)).body.totals.outstanding, 40000.25);
  assert.equal((await warden.get('/api/fees/dues')).body[0].outstanding, 40000.25);
  assert.equal((await student.post('/api/fees/payments').send({ studentId: s.id, amount: 1, paidOn: '2026-10-20' })).status, 403);
  assert.equal((await warden.post('/api/fees/payments').send({ studentId: s.id, amount: -5, paidOn: '2026-10-20' })).status, 400);
});

test('TC-Admin-02 visitor records are created and retrieved completely; students see only their own', async () => {
  const v = await warden.post('/api/visitors').send({ studentId: s.id, visitorName: 'Parent A', idType: 'Aadhaar', idNumber: 'XXXX1234', visitAt: '2026-10-30T10:00:00Z', purpose: 'Family visit', relation: 'Father' });
  assert.equal(v.status, 201); assert.equal(v.body.status, 'approved');
  const sv = await student.post('/api/visitors').send({ visitorName: 'Friend B', idType: 'DL', idNumber: 'DL99', visitAt: '2026-10-31T10:00:00Z', purpose: 'Meet' });
  assert.equal(sv.body.status, 'pending');
  const list = (await warden.get('/api/visitors')).body;
  assert.equal(list.length, 2);
  assert.ok(['visitorName', 'idType', 'idNumber', 'visitAt', 'purpose', 'status'].every((k) => list[0][k] !== undefined));
  assert.equal((await warden.patch(`/api/visitors/${sv.body.id}/status`).send({ status: 'approved', remarks: 'OK' })).status, 200);
  assert.equal((await warden.patch(`/api/visitors/${sv.body.id}/status`).send({ status: 'approved' })).status, 409);
  assert.equal((await student.patch(`/api/visitors/${sv.body.id}/status`).send({ status: 'approved' })).status, 403);
});

test('TC-Admin-03 leave/outpass: status changes only via authorized actions; remarks retained', async () => {
  const l = await student.post('/api/leave').send({ type: 'outpass', fromAt: '2026-11-02T08:00:00Z', toAt: '2026-11-02T20:00:00Z', reason: 'Medical appointment' });
  assert.equal(l.status, 201);
  assert.equal((await student.post('/api/leave').send({ type: 'leave', fromAt: '2026-11-05T08:00:00Z', toAt: '2026-11-04T08:00:00Z', reason: 'Bad range' })).status, 400);
  assert.equal((await student.post(`/api/leave/${l.body.id}/decision`).send({ decision: 'approved' })).status, 403);
  assert.equal((await warden.post(`/api/leave/${l.body.id}/decision`).send({ decision: 'rejected' })).status, 400); // remarks needed
  const d = await warden.post(`/api/leave/${l.body.id}/decision`).send({ decision: 'rejected', remarks: 'Exam week' });
  assert.equal(d.status, 200);
  assert.equal((await warden.post(`/api/leave/${l.body.id}/decision`).send({ decision: 'approved' })).status, 409);
  const mine = (await student.get('/api/leave')).body[0];
  assert.equal(mine.status, 'rejected'); assert.equal(mine.remarks, 'Exam week');
  assert.equal((await student.post(`/api/leave/${l.body.id}/cancel`)).status, 409);
});

test('TC-Admin-04 reports match underlying records for the selected period', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const occ = (await warden.get(`/api/reports/occupancy?from=${today}&to=${today}`)).body;
  assert.equal(occ.period.from, today); assert.ok(occ.occupancy && occ.allocations);
  const dues = (await warden.get(`/api/reports/fee-dues?from=2026-01-01&to=2026-12-31`)).body;
  assert.equal(dues.rows[0].outstanding, 40000.25);
  const vis = (await warden.get('/api/reports/visitors?from=2026-10-01&to=2026-10-31')).body;
  assert.equal(vis.summary.count, (await warden.get('/api/visitors?from=2026-10-01&to=2026-10-31')).body.length);
  const lv = (await warden.get('/api/reports/leave?from=2000-01-01&to=2100-01-01')).body;
  assert.equal(lv.summary.byStatus.rejected, 1);
  assert.equal((await warden.get('/api/reports/occupancy?from=2026-12-01&to=2026-11-01')).status, 400);
  assert.equal((await warden.get('/api/reports/visitors?from=2026-10-01&to=2026-10-31&format=csv')).type, 'text/csv');
  assert.equal((await student.get('/api/reports/occupancy')).status, 403);
  assert.equal((await warden.get('/api/reports/nope')).status, 404);
});

test('TC-Sec-04 sensitive records: cross-student access blocked; staff access to critical records is audited', async () => {
  const s2 = await h.mkUser('student', 2);
  const student2 = await h.login(s2);
  assert.equal((await student2.get(`/api/fees/ledger/${s.id}`)).status, 403);
  assert.equal((await student2.get(`/api/students/${s.id}`)).status, 403);
  assert.equal((await student2.get('/api/fees/me')).body.totals.assessed, 0);
  await warden.get(`/api/students/${s.id}`);
  const log = (await admin.get('/api/admin/audit?action=STUDENT_RECORD_VIEW')).body;
  assert.ok(log.length >= 1 && log[0].role === 'warden');
});

test('TC-Sec-05 audit events recorded with user/timestamp; chain verifies and detects tampering', async () => {
  const logs = (await admin.get('/api/admin/audit?limit=500')).body;
  const actions = new Set(logs.map((l) => l.action));
  for (const a of ['LOGIN', 'FEE_ASSESSMENT', 'VISITOR_CREATE', 'LEAVE_DECISION']) assert.ok(actions.has(a), `missing audit action ${a}`);
  assert.ok(logs.every((l) => l.createdAt && (l.userId !== null || l.action === 'LOGIN_FAILED')));
  assert.equal((await admin.get('/api/admin/audit/verify')).body.valid, true);
  await h.pool.query("UPDATE audit_logs SET action = 'TAMPERED' WHERE action = 'FEE_PAYMENT' LIMIT 1");
  const v = (await admin.get('/api/admin/audit/verify')).body;
  assert.equal(v.valid, false); assert.ok(v.brokenAtId);
});

test('Operations: health endpoint, consistent JSON errors, malformed JSON, unknown routes', async () => {
  assert.equal((await h.request(h.app).get('/api/health')).body.status, 'ok');
  const nf = await h.request(h.app).get('/api/does-not-exist');
  assert.equal(nf.status, 401); // unauthenticated callers learn nothing about routes
  const bad = await warden.post('/api/blocks').set('Content-Type', 'application/json').send('{bad json');
  assert.equal(bad.status, 400); assert.equal(bad.body.errorCode, 'VALIDATION_ERROR');
  assert.equal((await warden.get('/api/does-not-exist')).body.errorCode, 'NOT_FOUND');
});
