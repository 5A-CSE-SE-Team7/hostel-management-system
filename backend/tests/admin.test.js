// Sprint1 cases are preserved once in sprint1.test.js. This file adds only
// the real report regression and its independent API-created fixture.
const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
let warden, student, s;
test.before(async () => {
  await h.resetDb(); warden=await h.login(await h.mkUser('warden'));
  s=await h.mkUser('student'); student=await h.login(s);
  const a=await warden.post('/api/fees/assessments').send({studentId:s.id,description:'Term 1 hostel fee',amount:50000.5,dueDate:'2026-11-01'}); assert.equal(a.status,201);
  assert.equal((await warden.post('/api/fees/assessments').send({studentId:s.id,description:'Mess advance',amount:10000,dueDate:'2026-11-15'})).status,201);
  assert.equal((await warden.post('/api/fees/payments').send({studentId:s.id,assessmentId:a.body.id,amount:20000.25,paidOn:'2026-10-20',reference:'REPORT-1'})).status,201);
  assert.equal((await warden.post('/api/visitors').send({studentId:s.id,visitorName:'Report visitor',idType:'DL',idNumber:'TEST',visitAt:'2026-10-30T10:00:00Z',purpose:'Report test'})).status,201);
  const leave=await student.post('/api/leave').send({type:'outpass',fromAt:'2026-11-02T08:00:00Z',toAt:'2026-11-02T20:00:00Z',reason:'Report test'}); assert.equal(leave.status,201);
  assert.equal((await warden.post(`/api/leave/${leave.body.id}/decision`).send({decision:'rejected',remarks:'Exam week'})).status,200);
});
test.after(h.closeAll);

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

