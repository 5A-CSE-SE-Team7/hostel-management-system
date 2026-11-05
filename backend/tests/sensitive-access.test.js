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

test('TC-Sec-04 sensitive records: cross-student access blocked; staff access to critical records is audited', async () => {
  const s2 = await h.mkUser('student', 2);
  const student2 = await h.login(s2);

  // A student profile endpoint is always scoped to the authenticated account.
  const ownProfile = await student2.get('/api/profile');
  assert.equal(ownProfile.status, 200);
  assert.equal(ownProfile.body.id, s2.id);
  assert.equal((await student2.get(`/api/fees/ledger/${s.id}`)).status, 403);
  assert.equal((await student2.get(`/api/students/${s.id}`)).status, 403);
  assert.equal((await student2.get('/api/fees/me')).body.totals.assessed, 0);

  // Student collections and single-record routes must not disclose another student's records.
  const categoryId = await h.seedCategory('Access control test');
  const complaint = await student.post('/api/complaints').send({
    categoryId, location: 'Room 101', description: 'Synthetic access-control complaint',
  });
  assert.equal(complaint.status, 201);
  assert.equal((await student2.get('/api/complaints')).body.some((row) => row.id === complaint.body.complaintId), false);
  assert.equal((await student2.get(`/api/complaints/${complaint.body.complaintId}`)).status, 404);

  const visitor = await student.post('/api/visitors').send({
    visitorName: 'Synthetic Visitor', idType: 'Test ID', idNumber: 'TEST-001',
    visitAt: '2026-11-01T10:00:00Z', purpose: 'Access-control test',
  });
  assert.equal(visitor.status, 201);
  assert.equal((await student2.get('/api/visitors')).body.some((row) => row.id === visitor.body.id), false);

  const leave = await student.post('/api/leave').send({
    type: 'outpass', fromAt: '2026-11-02T08:00:00Z', toAt: '2026-11-02T20:00:00Z',
    reason: 'Synthetic access-control test',
  });
  assert.equal(leave.status, 201);
  assert.equal((await student2.get('/api/leave')).body.some((row) => row.id === leave.body.id), false);
  assert.equal((await student2.post(`/api/leave/${leave.body.id}/cancel`)).status, 409);

  // Staff may read these records, and both critical reads must be auditable.
  assert.equal((await warden.get(`/api/students/${s.id}`)).status, 200);
  assert.equal((await warden.get(`/api/fees/ledger/${s.id}`)).status, 200);
  const [auditRows] = await h.pool.query(
    `SELECT action, role, entity_id FROM audit_logs
     WHERE action IN ('STUDENT_RECORD_VIEW', 'FEE_LEDGER_VIEW') AND entity_id = ?`, [String(s.id)],
  );
  assert.ok(auditRows.some((row) => row.action === 'STUDENT_RECORD_VIEW' && row.role === 'warden'));
  assert.ok(auditRows.some((row) => row.action === 'FEE_LEDGER_VIEW' && row.role === 'warden'));
});


test('critical staff collection reads are audited and fail closed when audit persistence is unavailable', async () => {
 for (const path of ['/api/students','/api/fees/dues','/api/visitors','/api/leave','/api/complaints']) assert.equal((await warden.get(path)).status,200);
 const [rows]=await h.pool.query('SELECT DISTINCT action FROM audit_logs'); const actions=new Set(rows.map(r=>r.action));
 for(const action of ['STUDENT_RECORD_LIST','FEE_DUES_VIEW','VISITOR_RECORD_VIEW','LEAVE_RECORD_VIEW','COMPLAINT_RECORD_VIEW'])assert.ok(actions.has(action),action);
 await h.pool.query('DELETE FROM audit_head WHERE id=1');
 for(const path of [`/api/fees/ledger/${s.id}`,'/api/students','/api/visitors','/api/leave','/api/complaints']){
  const r=await warden.get(path);assert.equal(r.status,500);assert.equal(r.body.errorCode,'INTERNAL_ERROR');assert.equal(Array.isArray(r.body),false);
 }
});
