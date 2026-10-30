// Synthetic seed data ONLY (STP section 6: no real credentials/personal data). Usage: npm run db:seed
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

const PASSWORD = 'Hostel@123';

async function seedDatabase(db = pool) {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const user = async (email, name, role) => {
      await conn.query(
        `INSERT INTO users (email, password_hash, name, role, is_active)
         VALUES (?,?,?,?,1)
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name), role = VALUES(role), is_active = 1`,
        [email, hash, name, role],
      );
      const [[u]] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
      return u.id;
    };

    await user('admin@hms.test', 'System Admin', 'admin');
    await user('warden@hms.test', 'Warden One', 'warden');
    await user('maint1@hms.test', 'Maintenance One', 'maintenance');
    await user('maint2@hms.test', 'Maintenance Two', 'maintenance');
    for (let i = 1; i <= 6; i += 1) {
      const id = await user(`student${i}@hms.test`, `Student ${i}`, 'student');
      const srn = `PES2UG24CS${String(100 + i)}`;
      // ON DUPLICATE KEY must not silently update another student's SRN row.
      const [owners] = await conn.query(
        'SELECT user_id FROM students WHERE srn = ? AND user_id <> ? FOR UPDATE', [srn, id],
      );
      if (owners.length) throw new Error('Synthetic SRN is already owned by another account');
      await conn.query(
        `INSERT INTO students (user_id, srn, contact, department, year_of_study)
         VALUES (?,?,?,?,?)
         ON DUPLICATE KEY UPDATE srn = VALUES(srn), contact = VALUES(contact), department = VALUES(department), year_of_study = VALUES(year_of_study)`,
        [id, srn, `99000000${String(i).padStart(2, '0')}`, 'CSE', 2],
      );
    }
    for (const category of ['Electrical', 'Plumbing', 'Furniture', 'Internet', 'Cleaning', 'Other']) {
      await conn.query('INSERT IGNORE INTO complaint_categories (name) VALUES (?)', [category]);
    }
    for (const blockName of ['Block A', 'Block B']) {
      await conn.query('INSERT IGNORE INTO blocks (name) VALUES (?)', [blockName]);
      const [[block]] = await conn.query('SELECT id FROM blocks WHERE name = ?', [blockName]);
      for (let roomNumber = 101; roomNumber <= 103; roomNumber += 1) {
        await conn.query('INSERT IGNORE INTO rooms (block_id, room_number, floor) VALUES (?,?,1)', [block.id, String(roomNumber)]);
        const [[room]] = await conn.query('SELECT id FROM rooms WHERE block_id = ? AND room_number = ?', [block.id, String(roomNumber)]);
        for (const label of ['1', '2']) {
          await conn.query('INSERT IGNORE INTO beds (room_id, label) VALUES (?,?)', [room.id, label]);
        }
      }
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log(`Seeded. All demo accounts use password: ${PASSWORD}`);
      console.log('admin@hms.test | warden@hms.test | maint1@hms.test | student1@hms.test ... student6@hms.test');
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { seedDatabase, PASSWORD };
