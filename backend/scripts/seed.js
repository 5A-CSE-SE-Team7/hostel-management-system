// Synthetic seed data ONLY (STP section 6: no real credentials/personal data). Usage: npm run db:seed
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

const PASSWORD = 'Hostel@123';

(async () => {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const user = async (email, name, role) => {
    await pool.query('INSERT IGNORE INTO users (email, password_hash, name, role) VALUES (?,?,?,?)', [email, hash, name, role]);
    const [[u]] = await pool.query('SELECT id FROM users WHERE email = ?', [email]); return u.id;
  };
  await user('admin@hms.test', 'System Admin', 'admin');
  await user('warden@hms.test', 'Warden One', 'warden');
  await user('maint1@hms.test', 'Maintenance One', 'maintenance');
  await user('maint2@hms.test', 'Maintenance Two', 'maintenance');
  for (let i = 1; i <= 6; i += 1) {
    const id = await user(`student${i}@hms.test`, `Student ${i}`, 'student');
    await pool.query('INSERT IGNORE INTO students (user_id, srn, contact, department, year_of_study) VALUES (?,?,?,?,?)',
      [id, `PES2UG24CS${String(100 + i)}`, `99000000${String(i).padStart(2, '0')}`, 'CSE', 2]);
  }
  for (const c of ['Electrical', 'Plumbing', 'Furniture', 'Internet', 'Cleaning', 'Other']) {
    await pool.query('INSERT IGNORE INTO complaint_categories (name) VALUES (?)', [c]);
  }
  for (const bn of ['Block A', 'Block B']) {
    await pool.query('INSERT IGNORE INTO blocks (name) VALUES (?)', [bn]);
    const [[b]] = await pool.query('SELECT id FROM blocks WHERE name = ?', [bn]);
    for (let r = 101; r <= 103; r += 1) {
      await pool.query('INSERT IGNORE INTO rooms (block_id, room_number, floor) VALUES (?,?,1)', [b.id, String(r)]);
      const [[room]] = await pool.query('SELECT id FROM rooms WHERE block_id = ? AND room_number = ?', [b.id, String(r)]);
      for (const l of ['1', '2']) await pool.query('INSERT IGNORE INTO beds (room_id, label) VALUES (?,?)', [room.id, l]);
    }
  }
  console.log(`Seeded. All demo accounts use password: ${PASSWORD}`);
  console.log('admin@hms.test | warden@hms.test | maint1@hms.test | student1@hms.test ... student6@hms.test');
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
