const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
const { verifyChain } = require('../src/utils/audit');

test.beforeEach(h.resetDb);
test.after(h.closeAll);

for (const role of ['admin', 'warden']) {
  test(`${role} searches only eligible active students, preserving management search and RBAC`, async () => {
    const staff = await h.login(await h.mkUser(role));
    const eligible = await h.mkUser('student', 1);
    const inactive = await h.mkUser('student', 2);
    const allocated = await h.mkUser('student', 3);
    const formerStudent = await h.mkUser('student', 4);
    await h.pool.query('UPDATE users SET is_active=0 WHERE id=?', [inactive.id]);
    await h.pool.query("UPDATE users SET role='maintenance' WHERE id=?", [formerStudent.id]);
    const { bedIds } = await h.mkInventory(staff, 1, 'eligibility');
    assert.equal((await staff.post('/api/allocations').send({ studentId: allocated.id, bedId: bedIds[0] })).status, 201);

    for (const search of ['student 1', 'PES2UG24CS901', eligible.email]) {
      const result = await staff.get('/api/students').query({ eligibleForAllocation: 'true', search });
      assert.equal(result.status, 200);
      assert.deepEqual(result.body.map(row => row.id), [eligible.id]);
    }
    const allEligible = await staff.get('/api/students?eligibleForAllocation=true');
    assert.deepEqual(allEligible.body.map(row => row.id), [eligible.id]);
    const management = await staff.get('/api/students');
    assert.deepEqual(management.body.map(row => row.id).sort(), [eligible.id, inactive.id, allocated.id].sort());
    assert.equal((await staff.get('/api/students?eligibleForAllocation=invalid')).status, 400);
    assert.equal((await h.request(h.app).get('/api/students?eligibleForAllocation=true')).status, 401);
    for (const user of [eligible, formerStudent]) {
      assert.equal((await (await h.login(user)).get('/api/students?eligibleForAllocation=true')).status, 403);
    }
    assert.equal((await verifyChain()).valid, true);
  });

  test(`${role} allocation rejects invalid/inactive/current students and preserves the complete stay lifecycle`, async () => {
    const actor = await h.mkUser(role);
    const staff = await h.login(actor);
    const student = await h.mkUser('student', 1);
    const inactive = await h.mkUser('student', 2);
    await h.pool.query('UPDATE users SET is_active=0 WHERE id=?', [inactive.id]);
    const { bedIds } = await h.mkInventory(staff, 2, 'lifecycle');
    for (const studentId of [99999999, inactive.id, actor.id]) {
      assert.equal((await staff.post('/api/allocations').send({ studentId, bedId: bedIds[0] })).status, 400);
    }
    const allocation = await staff.post('/api/allocations').send({ studentId: student.id, bedId: bedIds[0] });
    assert.equal(allocation.status, 201);
    const duplicate = await staff.post('/api/allocations').send({ studentId: student.id, bedId: bedIds[1] });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.errorCode, 'ALREADY_ALLOCATED');
    assert.equal((await staff.post(`/api/allocations/${allocation.body.id}/check-in`).send({})).status, 200);
    const transferred = await staff.post(`/api/allocations/${allocation.body.id}/transfer`).send({ targetBedId: bedIds[1] });
    assert.equal(transferred.status, 200);
    assert.equal(transferred.body.status, 'checked_in');
    assert.equal((await staff.get('/api/occupancy')).body.occupiedBeds, 1);
    assert.equal((await staff.post(`/api/allocations/${transferred.body.allocationId}/check-out`).send({})).status, 200);
    assert.equal((await staff.get('/api/occupancy')).body.occupiedBeds, 0);
    const history = await staff.get('/api/allocations/history');
    assert.deepEqual(history.body.map(row => row.status).sort(), ['checked_out', 'transferred']);
    const eligibleAgain = await staff.get('/api/students?eligibleForAllocation=true');
    assert.deepEqual(eligibleAgain.body.map(row => row.id), [student.id]);
    assert.equal((await verifyChain()).valid, true);
  });
}

for (const role of ['admin', 'warden', 'maintenance']) {
  test(`${role} name edits persist without requiring student fields or permitting protected changes`, async () => {
    const account = await h.mkUser(role);
    const client = await h.login(account);
    const profile = (await client.get('/api/profile')).body;
    const result = await client.put('/api/profile').send({ ...profile, name: 'Staff Updated',
      contact: null, guardianContact: 'not-a-contact', yearOfStudy: 99,
      email: 'changed@t.test', role: 'student', srn: 'CHANGED', id: 99999999 });
    assert.equal(result.status, 200);
    const persisted = (await client.get('/api/profile')).body;
    assert.equal(persisted.name, 'Staff Updated');
    assert.equal(persisted.email, account.email);
    assert.equal(persisted.role, role);
    assert.equal(persisted.srn, null);
    const [[rows]] = await h.pool.query('SELECT COUNT(*) count FROM students WHERE user_id=?', [account.id]);
    assert.equal(rows.count, 0);
    assert.equal((await client.put('/api/profile').send({ name: '   ' })).status, 400);
  });
}

test('student and staff-managed profile updates retain immutable student identity', async () => {
  const user = await h.mkUser('student');
  const student = await h.login(user);
  const warden = await h.login(await h.mkUser('warden'));
  for (const [client, path] of [[student, '/api/profile'], [warden, `/api/students/${user.id}`]]) {
    const result = await client.put(path).send({ name: 'Student Updated', contact: '9111111111',
      department: 'CSE', yearOfStudy: 2, srn: 'CHANGED', email: 'changed@t.test', role: 'admin' });
    assert.equal(result.status, 200);
    assert.equal(result.body.srn, 'PES2UG24CS901');
    assert.equal(result.body.email, user.email);
    assert.equal(result.body.role, 'student');
  }
  assert.equal((await student.put('/api/profile').send({ name: 'Must not persist', contact: 'bad' })).status, 400);
  assert.equal((await student.get('/api/profile')).body.name, 'Student Updated');
});
