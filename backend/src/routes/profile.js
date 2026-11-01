const router = require('express').Router();
const { pool, withTransaction } = require('../db');
const { E } = require('../utils/errors');
const { audit } = require('../utils/audit');
const { validate, parseId } = require('../utils/validate');
const { requireAuth, requireRole } = require('../middleware/auth');

const staffOnly = requireRole('warden', 'admin');
const studentFields = ['contact', 'department', 'yearOfStudy', 'guardianName', 'guardianContact', 'address'];
const editableRules = {
  name: { max: 120, label: 'Name' },
  contact: { pattern: /^[0-9+\-\s]{7,20}$/, label: 'Contact number', patternMessage: 'Contact number is not valid' },
  department: { max: 80, label: 'Department' },
  yearOfStudy: { type: 'int', min: 1, max: 8, label: 'Year of study' },
  guardianName: { max: 120, label: 'Guardian name' },
  guardianContact: { pattern: /^[0-9+\-\s]{7,20}$/, label: 'Guardian contact', patternMessage: 'Guardian contact is not valid' },
  address: { max: 300, label: 'Address' },
};

function validateProfileUpdate(body) {
  const src = body && typeof body === 'object' ? body : {};
  const errors = {};
  for (const field of ['name', 'contact']) {
    if (Object.hasOwn(src, field) && (typeof src[field] !== 'string' || !src[field].trim())) {
      errors[field] = `${editableRules[field].label} cannot be empty`;
    }
  }
  if (Object.keys(errors).length) throw E.validation(errors);

  const data = validate(src, editableRules);
  // Empty optional text fields (and year) are an explicit request to clear the value.
  for (const field of ['department', 'guardianName', 'guardianContact', 'address', 'yearOfStudy']) {
    if (Object.hasOwn(src, field) && (src[field] === '' || src[field] === null)) data[field] = null;
  }
  return data;
}

async function findProfile(userId) {
  const [[profile]] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, s.srn, s.contact, s.department,
            s.year_of_study AS yearOfStudy, s.guardian_name AS guardianName,
            s.guardian_contact AS guardianContact, s.address
       FROM users u LEFT JOIN students s ON s.user_id = u.id
      WHERE u.id = ?`,
    [userId],
  );
  if (!profile) throw E.notFound('Profile');
  return profile;
}

async function updateProfile(userId, role, body) {
  const data = validateProfileUpdate(body);
  const studentUpdates = role === 'student'
    ? studentFields.filter((field) => Object.hasOwn(data, field))
    : [];
  const updateName = Object.hasOwn(data, 'name');

  if (!updateName && studentUpdates.length === 0) return findProfile(userId);

  await withTransaction(async (conn) => {
    if (updateName) await conn.query('UPDATE users SET name = ? WHERE id = ?', [data.name, userId]);
    if (studentUpdates.length > 0) {
      const [[student]] = await conn.query('SELECT user_id FROM students WHERE user_id = ?', [userId]);
      if (!student) throw E.notFound('Student profile');
      const assignments = {
        contact: 'contact',
        department: 'department',
        yearOfStudy: 'year_of_study',
        guardianName: 'guardian_name',
        guardianContact: 'guardian_contact',
        address: 'address',
      };
      const setClause = studentUpdates.map((field) => `\`${assignments[field]}\` = ?`).join(', ');
      const values = studentUpdates.map((field) => data[field]);
      await conn.query(`UPDATE students SET ${setClause} WHERE user_id = ?`, [...values, userId]);
    }
  });

  return findProfile(userId);
}

router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    return res.json(await findProfile(req.session.user.id));
  } catch (err) {
    return next(err);
  }
});

router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    return res.json(await updateProfile(req.session.user.id, req.session.user.role, req.body));
  } catch (err) {
    return next(err);
  }
});

router.get('/students', staffOnly, async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    const like = `%${search}%`;
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, s.srn, s.contact, s.department,
              s.year_of_study AS yearOfStudy, s.guardian_name AS guardianName,
              s.guardian_contact AS guardianContact, s.address
         FROM students s JOIN users u ON u.id = s.user_id
        WHERE ? = '' OR s.srn LIKE ? OR u.name LIKE ? OR u.email LIKE ?
        ORDER BY u.name, u.id LIMIT 100`,
      [search, like, like, like],
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

router.get('/students/:id', staffOnly, async (req, res, next) => {
  try {
    const id = parseId(req.params.id, 'studentId');
    const profile = await findProfile(id);
    if (profile.role !== 'student' || !profile.srn) throw E.notFound('Student');
    await audit(req, 'STUDENT_RECORD_VIEW', 'user', id, null, { strict: true });
    return res.json(profile);
  } catch (err) {
    return next(err);
  }
});

router.put('/students/:id', staffOnly, async (req, res, next) => {
  try {
    const id = parseId(req.params.id, 'studentId');
    const [[student]] = await pool.query('SELECT role FROM users WHERE id = ?', [id]);
    if (!student || student.role !== 'student') throw E.notFound('Student');
    return res.json(await updateProfile(id, 'student', req.body));
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
