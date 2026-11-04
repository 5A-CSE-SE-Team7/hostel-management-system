const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
let student, other, warden;
test.before(async () => {
  await h.resetDb(); student = await h.login(await h.mkUser('student', 1));
  other = await h.login(await h.mkUser('student', 2)); warden = await h.login(await h.mkUser('warden'));
});
test.after(h.closeAll);
test('leave decisions persist recipient-only notifications with retained remarks', async () => {
  assert.equal((await h.request(h.app).get('/api/notifications')).status, 401);
  for (const decision of ['approved', 'rejected']) {
    const created = await student.post('/api/leave').send({type:'outpass',fromAt:'2026-12-01T10:00:00Z',toAt:'2026-12-01T12:00:00Z',reason:'Synthetic appointment'});
    assert.equal(created.status,201);
    const result = await warden.post(`/api/leave/${created.body.id}/decision`).send({decision,remarks:'Synthetic decision remark'});
    assert.equal(result.status,200);
    const inbox = await student.get('/api/notifications');
    assert.equal(inbox.status,200);
    assert.ok(inbox.body.some(n=>n.type==='leave_decision' && n.message.includes(decision) && n.message.includes('Synthetic decision remark')));
  }
  assert.deepEqual((await other.get('/api/notifications?userId=1')).body, []);
  assert.deepEqual((await warden.get('/api/notifications')).body, []);
});
