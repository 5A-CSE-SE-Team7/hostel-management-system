const test = require('node:test');
const assert = require('node:assert/strict');
if (process.env.DB_NAME !== 'hms_test') throw new Error('Use isolated hms_test');
const h = require('./helpers');
let warden, student, user;
test.before(async () => {
  await h.resetDb(); user = await h.mkUser('student'); student = await h.login(user); warden = await h.login(await h.mkUser('warden'));
});
test.after(h.closeAll);
test('fee calendars reject array inputs and impossible dates before SQL', async () => {
  for (const dueDate of [['2026-10-30'],'2026-02-30','0100-01-01']) {
    const result = await warden.post('/api/fees/assessments').send({studentId:user.id,description:'Invalid calendar',amount:1,dueDate});
    assert.equal(result.status,400); assert.ok(result.body.details.dueDate);
  }
  const [[row]] = await h.pool.query('SELECT COUNT(*) n FROM fee_assessments'); assert.equal(row.n,0);
});
test('visitor datetime rejects wrong JSON types and rollover without creating records', async () => {
  for (const visitAt of [['2026-10-30T10:00:00Z'],true,'2026-02-30T10:00:00Z']) {
    const result = await student.post('/api/visitors').send({visitorName:'Calendar test',idType:'DL',idNumber:'TEST',purpose:'Test',visitAt});
    assert.equal(result.status,400); assert.ok(result.body.details.visitAt);
  }
  const [[row]] = await h.pool.query('SELECT COUNT(*) n FROM visitors'); assert.equal(row.n,0);
});
test('leave datetime validation rejects malformed calendars and retains valid transitions', async () => {
  for (const fromAt of [['2026-10-30T10:00:00Z'],true,'2026-02-30T10:00:00Z']) {
    const result = await student.post('/api/leave').send({type:'outpass',fromAt,toAt:'2026-11-01T12:00:00Z',reason:'Calendar test'});
    assert.equal(result.status,400); assert.ok(result.body.details.fromAt);
  }
  const result=await student.post('/api/leave').send({type:'outpass',fromAt:'2028-02-29T10:00:00Z',toAt:'2028-02-29T12:00:00Z',reason:'Leap day'});
  assert.equal(result.status,201); assert.equal(result.body.status,'pending');
});
