// M1 - HMS-F-003 (profile), SR-004 (sensitive record access logging)
const router = require('express').Router();
const { pool } = require('../db');
const { E } = require('../utils/errors');
const { validate, parseId } = require('../utils/validate');
const { audit } = require('../utils/audit');
const { requireAuth, requireRole, STAFF } = require('../middleware/auth');

const PROFILE_SELECT = `SELECT u.id, u.name, u.email, u.role, u.is_active AS isActive, s.srn, s.contact, s.department,
  s.year_of_study AS yearOfStudy, s.guardian_name AS guardianName, s.guardian_contact AS guardianContact, s.address
  FROM users u LEFT JOIN students s ON s.user_id = u.id`;

// Only these fields may be edited via the profile endpoints. srn/email/role are NOT editable here.
const PERMITTED = {
  name: { max: 120 },
  contact: { pattern: /^[0-9+\-\s]{7,20}$/, patternMessage: 'Contact number is not valid' },
  department: { max: 80 },
  yearOfStudy: { type: 'int', min: 1, max: 8, label: 'Year of study' },
  guardianName: { max: 120 },
  guardianContact: { pattern: /^[0-9+\-\s]{7,20}$/, patternMessage: 'Guardian contact is not valid' },
  address: { max: 300 },
};

async function applyUpdate(userId, d) {
  const sets = []; const vals = [];
  const map = { contact: 'contact', department: 'department', yearOfStudy: 'year_of_study', guardianName: 'guardian_name', guardianContact: 'guardian_contact', address: 'address' };
  for (const [k, col] of Object.entries(map)) if (d[k] !== undefined) { sets.push(`${col} = ?`); vals.push(d[k]); }
  if (sets.length) await pool.query(`UPDATE students SET ${sets.join(', ')} WHERE user_id = ?`, [...vals, userId]);
  if (d.name !== undefined) await pool.query('UPDATE users SET name = ? WHERE id = ?', [d.name, userId]);
}

// own profile - TC-Auth-03
router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const [[p]] = await pool.query(`${PROFILE_SELECT} WHERE u.id = ?`, [req.session.user.id]);
    res.json(p);
  } catch (e) { next(e); }
});

router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const d = validate(req.body, PERMITTED);
    if (!Object.keys(d).length) throw E.validation({ _: 'No editable fields supplied' });
    if (req.session.user.role !== 'student') delete d.contact; // staff only keep a display name
    await applyUpdate(req.session.user.id, d);
    if (d.name) req.session.user.name = d.name;
    await audit(req, 'PROFILE_UPDATE', 'user', req.session.user.id, { fields: Object.keys(d) });
    const [[p]] = await pool.query(`${PROFILE_SELECT} WHERE u.id = ?`, [req.session.user.id]);
    res.json(p);
  } catch (e) { next(e); }
});

// staff: list/search students
router.get('/students', requireRole(...STAFF), async (req, res, next) => {
  try {
    const q = `%${(req.query.q || '').toString().slice(0, 60)}%`;
    const [rows] = await pool.query(
      `${PROFILE_SELECT} WHERE u.role = 'student' AND (u.name LIKE ? OR s.srn LIKE ? OR u.email LIKE ?) ORDER BY u.name LIMIT 200`, [q, q, q]);
    res.json(rows);
  } catch (e) { next(e); }
});

// staff: view a student's record - access to a critical record is audited (HMS-SR-004)
router.get('/students/:id', requireRole(...STAFF), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const [[p]] = await pool.query(`${PROFILE_SELECT} WHERE u.id = ? AND u.role = 'student'`, [id]);
    if (!p) throw E.notFound('Student');
    await audit(req, 'STUDENT_RECORD_VIEW', 'user', id, null);
    res.json(p);
  } catch (e) { next(e); }
});

router.put('/students/:id', requireRole(...STAFF), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const d = validate(req.body, PERMITTED);
    const [[p]] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'student'", [id]);
    if (!p) throw E.notFound('Student');
    await applyUpdate(id, d);
    await audit(req, 'PROFILE_UPDATE', 'user', id, { fields: Object.keys(d), by: 'staff' });
    const [[out]] = await pool.query(`${PROFILE_SELECT} WHERE u.id = ?`, [id]);
    res.json(out);
  } catch (e) { next(e); }
});

module.exports = router;
