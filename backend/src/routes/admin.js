// M1 - role management for the System Administrator (HMS-F-004, HMS-SR-005 role-management audit)
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const config = require('../config');
const { pool } = require('../db');
const { E } = require('../utils/errors');
const { validate, parseId } = require('../utils/validate');
const { audit, verifyChain } = require('../utils/audit');
const { requireRole } = require('../middleware/auth');

router.use(requireRole('admin'));

router.get('/users', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role, is_active AS isActive, created_at AS createdAt FROM users ORDER BY id DESC LIMIT 500');
    res.json(rows);
  } catch (e) { next(e); }
});

// Staff accounts (warden, maintenance, admin) are created by the System Administrator only.
router.post('/users', async (req, res, next) => {
  try {
    const d = validate(req.body, {
      name: { required: true, max: 120 }, email: { type: 'email', required: true },
      password: { required: true, pattern: /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/, label: 'Password', patternMessage: 'Password must be 8-72 characters with a letter and a digit' },
      role: { required: true, enum: ['warden', 'maintenance', 'admin'] },
    });
    const hash = await bcrypt.hash(d.password, config.bcryptRounds);
    const [r] = await pool.query('INSERT INTO users (email, password_hash, name, role) VALUES (?,?,?,?)', [d.email, hash, d.name, d.role]);
    await audit(req, 'ROLE_ASSIGNED', 'user', r.insertId, { role: d.role, created: true });
    res.status(201).json({ id: r.insertId, name: d.name, email: d.email, role: d.role });
  } catch (e) { next(e); }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const d = validate(req.body, { role: { enum: ['student', 'warden', 'maintenance', 'admin'] }, isActive: { type: 'bool' } });
    if (id === req.session.user.id && (d.role && d.role !== 'admin' || d.isActive === false)) {
      throw E.conflict('You cannot demote or deactivate your own account', 'SELF_LOCKOUT');
    }
    const [[u]] = await pool.query('SELECT id, role FROM users WHERE id = ?', [id]);
    if (!u) throw E.notFound('User');
    if (d.role && d.role !== u.role && (u.role === 'student' || d.role === 'student')) {
      throw E.conflict('Roles cannot be switched to or from student', 'ROLE_CHANGE_NOT_ALLOWED');
    }
    if (d.role !== undefined) await pool.query('UPDATE users SET role = ? WHERE id = ?', [d.role, id]);
    if (d.isActive !== undefined) await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [d.isActive ? 1 : 0, id]);
    await audit(req, 'ROLE_CHANGED', 'user', id, { from: u.role, ...d });
    res.json({ id, ...d });
  } catch (e) { next(e); }
});

// Audit viewer (HMS-SR-005 / TC-Sec-05)
router.get('/audit', async (req, res, next) => {
  try {
    const where = []; const vals = [];
    if (req.query.action) { where.push('action = ?'); vals.push(String(req.query.action)); }
    if (req.query.userId) { where.push('user_id = ?'); vals.push(parseId(req.query.userId, 'userId')); }
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const [rows] = await pool.query(
      `SELECT id, user_id AS userId, role, action, entity, entity_id AS entityId, details, ip, created_at AS createdAt, hash
       FROM audit_logs ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT ${limit}`, vals);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/audit/verify', async (_req, res, next) => {
  try { res.json(await verifyChain()); } catch (e) { next(e); }
});

module.exports = router;
