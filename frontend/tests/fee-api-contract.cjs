// Read-only teammate implementation; mutations target synthetic hms_test only.
const test = require('node:test');
const assert = require('node:assert/strict');
if (process.env.DB_NAME !== 'hms_test') throw new Error('Use isolated hms_test');
const h = require('../../backend/tests/helpers');
let student, warden, id;
test.before(async () => { await h.resetDb(); const user = await h.mkUser('student'); id = user.id; student = await h.login(user); warden = await h.login(await h.mkUser('warden')); });
test.after(h.closeAll);
test('real M4/M1 contracts support student picker, assessment, payment and ledger totals', async () => {
  const people = await warden.get('/api/students?q=student'); assert.equal(people.status, 200); assert.equal(people.body[0].id, id);
  const assessment = await warden.post('/api/fees/assessments').send({ studentId: id, description: 'Synthetic fee', amount: 100, dueDate: '2026-10-30' }); assert.equal(assessment.status, 201);
  const payment = await warden.post('/api/fees/payments').send({ studentId: id, assessmentId: assessment.body.id, amount: 30.5, paidOn: '2026-10-29', reference: 'Synthetic receipt' }); assert.equal(payment.status, 201);
  const own = await student.get('/api/fees/me'); assert.equal(own.status, 200); assert.deepEqual(own.body.totals, { assessed: 100, paid: 30.5, outstanding: 69.5 });
  assert.equal((await warden.get(`/api/fees/ledger/${id}`)).body.totals.outstanding, 69.5); assert.equal((await warden.get('/api/fees/dues')).body[0].studentId, id);
  assert.equal((await student.get('/api/fees/dues')).status, 403);
});
