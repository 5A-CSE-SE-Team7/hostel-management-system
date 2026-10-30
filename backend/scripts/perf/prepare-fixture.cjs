const { createRequire } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
if (!/^hms_perf_[0-9]+$/.test(process.env.DB_NAME || '')) throw new Error('Only a dedicated synthetic performance database is allowed');
const req = createRequire(path.join(process.env.HMS_BACKEND_ROOT, 'package.json'));
const { pool } = req('./src/db');
(async () => {
  // Dedicated synthetic database only: benchmark production-strength login hashes.
  const bcrypt = req('bcryptjs');
  await pool.query('UPDATE users SET password_hash = ?', [await bcrypt.hash('Hostel@123', 12)]);
  const [[databaseVersion]] = await pool.query('SELECT VERSION() version');
  const [students] = await pool.query("SELECT id FROM users WHERE role='student' ORDER BY id");
  const [[category]] = await pool.query('SELECT id FROM complaint_categories ORDER BY id LIMIT 1');
  const [beds] = await pool.query('SELECT id FROM beds ORDER BY id');
  const values = Array.from({length:1000},(_,i)=>[students[i%students.length].id,category.id,'Block A 101',`Synthetic performance complaint ${i+1}`]);
  await pool.query('INSERT INTO complaints (student_id,category_id,location,description) VALUES ?', [values]);
  await pool.query('INSERT INTO allocations (student_id,bed_id) VALUES ?', [students.map((student,i)=>[student.id,beds[i].id])]);
  await pool.query('INSERT INTO fee_assessments (student_id,description,amount,due_date,created_by) SELECT id, ?, 1000.00, CURDATE(), (SELECT id FROM users WHERE role=\'admin\' LIMIT 1) FROM users WHERE role=\'student\'', ['Synthetic performance assessment']);
  const plans={};
  const queries={
    inventory:'SELECT b.id,r.id,bd.id,a.id FROM blocks b LEFT JOIN rooms r ON r.block_id=b.id LEFT JOIN beds bd ON bd.room_id=r.id LEFT JOIN allocations a ON a.bed_id=bd.id AND a.released_at IS NULL ORDER BY b.name,r.room_number,bd.label',
    allocation_occupancy:'SELECT b.id,COUNT(d.id) AS totalBeds,SUM(a.id IS NOT NULL) AS occupiedBeds FROM blocks b LEFT JOIN rooms r ON r.block_id=b.id AND r.is_active=1 LEFT JOIN beds d ON d.room_id=r.id AND d.is_active=1 LEFT JOIN allocations a ON a.bed_id=d.id AND a.released_at IS NULL WHERE b.is_active=1 GROUP BY b.id',
    available_beds:'SELECT d.id FROM beds d JOIN rooms r ON r.id=d.room_id AND r.is_active=1 JOIN blocks b ON b.id=r.block_id AND b.is_active=1 WHERE d.is_active=1 AND NOT EXISTS (SELECT 1 FROM allocations a WHERE a.bed_id=d.id AND a.released_at IS NULL)',
    complaints:'SELECT c.id,cc.name FROM complaints c JOIN complaint_categories cc ON cc.id=c.category_id ORDER BY c.id DESC LIMIT 100',
    complaint_report:'SELECT c.id,u.name FROM complaints c JOIN users u ON u.id=c.student_id WHERE c.created_at BETWEEN DATE_FORMAT(CURDATE(),\'%Y-%m-01\') AND NOW() ORDER BY c.id',
  };
  for(const [name,sql] of Object.entries(queries)){const [rows]=await pool.query(`EXPLAIN ${sql}`);plans[name]={sql,rows};}
  const counts={};for(const table of ['users','students','beds','allocations','complaints','fee_assessments']){const [[row]]=await pool.query(`SELECT COUNT(*) AS count FROM ${table}`);counts[table]=row.count;}
  fs.writeFileSync(process.argv[2],JSON.stringify({synthetic:true,passwordHashCost:12,mysqlVersion:databaseVersion.version,counts,plans},null,2)+'\n');
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>pool.end());
