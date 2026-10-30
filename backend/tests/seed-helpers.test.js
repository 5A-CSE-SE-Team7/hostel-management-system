process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'hms_test';
const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const h = require('./helpers');
const config = require('../src/config');
const { seedDatabase, PASSWORD } = require('../scripts/seed');
test.beforeEach(h.resetDb);
test.after(h.closeAll);
async function counts() {
  const result = {};
  for (const table of ['users','students','complaint_categories','blocks','rooms','beds']) {
    const [[row]] = await h.pool.query(`SELECT COUNT(*) AS n FROM ${table}`); result[table] = row.n;
  }
  return result;
}
test('synthetic seed is repeatable and matches documented credentials and schema', async () => {
  assert.equal((await counts()).users, 0); // importing seed did not execute it
  assert.equal(PASSWORD, h.PASSWORD);
  await seedDatabase();
  const [before] = await h.pool.query('SELECT id,email,role FROM users ORDER BY id');
  await seedDatabase();
  const [after] = await h.pool.query('SELECT id,email,role FROM users ORDER BY id');
  assert.deepEqual(after, before);
  assert.deepEqual(await counts(), {users:10,students:6,complaint_categories:6,blocks:2,rooms:6,beds:12});
  const [users] = await h.pool.query('SELECT role,password_hash FROM users');
  assert.deepEqual(users.reduce((out,u)=>(out[u.role]=(out[u.role]||0)+1,out),{}),{admin:1,warden:1,maintenance:2,student:6});
  for (const user of users) assert.equal(await bcrypt.compare(PASSWORD,user.password_hash),true);
});
test('seed rejects another account owning a synthetic SRN and rolls back all writes', async () => {
  const other = await h.mkUser('student',99);
  await h.pool.query('UPDATE students SET srn=? WHERE user_id=?',['PES2UG24CS101',other.id]);
  await assert.rejects(seedDatabase(), /Synthetic SRN is already owned by another account/);
  assert.equal((await counts()).users,1);
  const [[profile]] = await h.pool.query('SELECT user_id,srn,contact FROM students');
  assert.deepEqual(profile,{user_id:other.id,srn:'PES2UG24CS101',contact:'9000000000'});
  assert.equal((await counts()).blocks,0);
});
test('reseed retains foreign keys and works with real seeded auth accounts', async () => {
  await seedDatabase();
  const [[student]] = await h.pool.query("SELECT id,email FROM users WHERE email='student1@hms.test'");
  const [[admin]] = await h.pool.query("SELECT id,email FROM users WHERE email='admin@hms.test'");
  const [[bed]] = await h.pool.query('SELECT id FROM beds ORDER BY id LIMIT 1');
  const [insert] = await h.pool.query('INSERT INTO allocations(student_id,bed_id,allocated_by) VALUES(?,?,?)',[student.id,bed.id,admin.id]);
  await seedDatabase();
  const [[allocation]] = await h.pool.query('SELECT student_id,bed_id FROM allocations WHERE id=?',[insert.insertId]);
  assert.deepEqual(allocation,{student_id:student.id,bed_id:bed.id});
  const studentAgent=await h.login(student),adminAgent=await h.login(admin);
  assert.equal((await studentAgent.get('/api/auth/me')).body.id,student.id);
  assert.equal((await adminAgent.get('/api/admin/audit/verify')).body.valid,true);
});
test('reset refuses a non-test target and repeated resets leave a fresh valid schema', async () => {
  const user=await h.mkUser('student'); const original=config.db.database;
  try {
    config.db.database='hms_seed_guard_sentinel';
    await assert.rejects(h.resetDb(),/Refusing to reset non-test database/);
  } finally { config.db.database=original; }
  assert.equal((await counts()).users,1);
  await h.resetDb(); await h.resetDb();
  assert.equal((await counts()).users,0);
  const [[head]]=await h.pool.query('SELECT last_hash FROM audit_head WHERE id=1');
  assert.equal(head.last_hash,'0'.repeat(64));
  await assert.rejects(h.pool.query('INSERT INTO students(user_id,srn,contact) VALUES(?,?,?)',[user.id,'PES2UG24CS999','9000000000']),e=>e.code==='ER_NO_REFERENCED_ROW_2');
});
