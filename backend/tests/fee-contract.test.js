// Real M1 authentication, real issue #21 M4 routes and isolated MySQL data.
// Copied only into the explicit combined candidate; never replaces owner code.
const test = require('node:test');
const assert = require('node:assert/strict');
if (process.env.DB_NAME !== 'hms_test') throw new Error('Use isolated hms_test');
const h = require('./helpers');
let warden, student, otherStudent, maintenance, s, other, assessmentId;
const fees = '/api/fees';
test.before(async () => {
  await h.resetDb();
  s = await h.mkUser('student'); other = await h.mkUser('student', 2);
  student = await h.login(s); otherStudent = await h.login(other);
  warden = await h.login(await h.mkUser('warden'));
  maintenance = await h.login(await h.mkUser('maintenance'));
});
test.after(h.closeAll);
test('fee contracts: assessment/payment rows and decimal totals persist in real MySQL', async () => {
  let r = await warden.post(`${fees}/assessments`).send({ studentId: s.id, description: 'Integration decimal fee', amount: 123.45, dueDate: '2026-12-01' });
  assert.equal(r.status, 201); assessmentId = r.body.id;
  r = await warden.post(`${fees}/payments`).send({ studentId: s.id, assessmentId, amount: 23.4, paidOn: '2026-10-30', reference: 'REAL-FIXTURE-RECEIPT' });
  assert.equal(r.status, 201);
  const [[assessment]] = await h.pool.query('SELECT amount, student_id FROM fee_assessments WHERE id=?', [assessmentId]);
  const [[payment]] = await h.pool.query('SELECT amount, student_id, assessment_id, reference FROM fee_payments WHERE id=?', [r.body.id]);
  assert.deepEqual(assessment, { amount: 123.45, student_id: s.id });
  assert.deepEqual(payment, { amount: 23.4, student_id: s.id, assessment_id: assessmentId, reference: 'REAL-FIXTURE-RECEIPT' });
  const mine = await student.get(`${fees}/me`); assert.equal(mine.status, 200);
  assert.deepEqual(mine.body.totals, { assessed: 123.45, paid: 23.4, outstanding: 100.05 });
  assert.equal(mine.body.assessments[0].paid, 23.4); assert.equal(mine.body.assessments[0].outstanding, 100.05);
  const staff = await warden.get(`${fees}/ledger/${s.id}`); assert.deepEqual(staff.body, mine.body);
  const dues = await warden.get(`${fees}/dues`); assert.equal(dues.status, 200);
  assert.equal(dues.body.find(row => row.studentId === s.id).outstanding, 100.05);
  const people = await warden.get('/api/students?search=PES2UG24CS901');
  assert.equal(people.status, 200); assert.deepEqual(people.body.map(row => row.id), [s.id]);
});
for (const [name, body] of [
  ['zero amount', { amount: 0, paidOn: '2026-10-30' }],
  ['negative amount', { amount: -1, paidOn: '2026-10-30' }],
  ['excessive amount', { amount: 10000001, paidOn: '2026-10-30' }],
  ['impossible calendar date', { amount: 2, paidOn: '2026-02-30' }],
  ['non-leap February 29', { amount: 2, paidOn: '2026-02-29' }],
  ['invalid date format', { amount: 2, paidOn: 'not-a-date' }],
  ['assessment of another student', () => ({ studentId: other.id, assessmentId, amount: 2, paidOn: '2026-10-30' })],
]) {
  test(`fee contracts: ${name} returns validation error without database writes`, async () => {
    const [[before]] = await h.pool.query('SELECT COUNT(*) n FROM fee_payments');
    const r = await warden.post(`${fees}/payments`).send({ studentId: s.id, ...(typeof body === 'function' ? body() : body) });
    const [[after]] = await h.pool.query('SELECT COUNT(*) n FROM fee_payments');
    assert.equal(after.n, before.n); assert.equal(r.status, 400, JSON.stringify(r.body)); assert.ok(r.body.details);
  });
}
test('fee contracts: nonexistent student is rejected', async () => {
  assert.equal((await warden.post(`${fees}/assessments`).send({ studentId: 999999, description: 'No student', amount: 1, dueDate: '2026-12-01' })).status, 404);
});
test('fee contracts: real session and role checks reject privileged requests and cross-student reads', async () => {
  assert.equal((await h.request(h.app).get(`${fees}/me`)).status, 401);
  for (const agent of [student, maintenance]) {
    for (const path of [`${fees}/dues`, `${fees}/ledger/${s.id}`]) assert.equal((await agent.get(path)).status, 403);
    for (const path of ['assessments', 'payments']) assert.equal((await agent.post(`${fees}/${path}`).send({ studentId: s.id, amount: 1 })).status, 403);
  }
  assert.deepEqual((await otherStudent.get(`${fees}/me`)).body.assessments, []);
});

test('fee contracts: impossible assessment calendar returns a field validation error', async () => {
  const r = await warden.post(`${fees}/assessments`).send({ studentId: s.id, description: 'Invalid calendar', amount: 1, dueDate: '2026-02-30' });
  assert.equal(r.status, 400, JSON.stringify(r.body)); assert.ok(r.body.details.dueDate);
});
test('fee contracts: a genuine leap-day payment is accepted', async () => {
  const r = await warden.post(`${fees}/payments`).send({ studentId: s.id, amount: 0.01, paidOn: '2028-02-29', reference: 'LEAP-DAY' });
  assert.equal(r.status, 201); const [[row]] = await h.pool.query('SELECT paid_on FROM fee_payments WHERE id=?', [r.body.id]); assert.equal(row.paid_on, '2028-02-29');
});
