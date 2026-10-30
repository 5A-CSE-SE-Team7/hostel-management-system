const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { pool, withTransaction } = require('../db');
const config = require('../config');
const { E } = require('../utils/errors');
const { validate, parseId } = require('../utils/validate');
const { requireRole } = require('../middleware/auth');
const { audit, verifyChain } = require('../utils/audit');

const adminOnly = requireRole('admin');
const accountRoles = ['student', 'warden', 'maintenance', 'admin'];
const staffRoles = ['warden', 'maintenance', 'admin'];
const passwordRule = {
  type: 'string',
  required: true,
  max: 72,
  pattern: /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/,
  label: 'Password',
  patternMessage: 'Password must be 8-72 characters and contain a letter and a digit',
};

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: Boolean(user.is_active),
  };
}

router.get('/users', adminOnly, async (_req, res, next) => {
  try {
    const [users] = await pool.query('SELECT id, name, email, role, is_active FROM users ORDER BY name, id');
    return res.json(users.map(publicUser));
  } catch (err) {
    return next(err);
  }
});

router.post('/users', adminOnly, async (req, res, next) => {
  try {
    const data = validate(req.body, {
      name: { required: true, max: 120, label: 'Name' },
      email: { type: 'email', required: true, label: 'Email' },
      password: passwordRule,
      role: { required: true, enum: staffRoles, label: 'Role' },
    });
    const passwordHash = await bcrypt.hash(data.password, config.bcryptRounds);
    let id;
    try {
      const [result] = await pool.query(
        'INSERT INTO users (email, password_hash, name, role) VALUES (?,?,?,?)',
        [data.email, passwordHash, data.name, data.role],
      );
      id = result.insertId;
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') throw E.conflict('Email is already registered', 'EMAIL_EXISTS', { email: 'This email is already registered' });
      throw err;
    }
    await audit(req, 'ROLE_ASSIGNED', 'user', id, { role: data.role });
    return res.status(201).json({ id, name: data.name, email: data.email, role: data.role, isActive: true });
  } catch (err) {
    return next(err);
  }
});

router.patch('/users/:id', adminOnly, async (req, res, next) => {
  try {
    const id = parseId(req.params.id, 'userId');
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const input = {};
    if (Object.hasOwn(body, 'role')) input.role = body.role;
    if (Object.hasOwn(body, 'isActive')) input.isActive = body.isActive;
    const data = validate(input, {
      role: { enum: accountRoles, label: 'Role' },
      isActive: { type: 'bool', label: 'Active status' },
    });
    if (Object.hasOwn(body, 'isActive') && ![true, false, 1, 0, '1', '0', 'true', 'false'].includes(body.isActive)) {
      throw E.validation({ isActive: 'Active status must be true or false' });
    }
    if (!Object.keys(data).length) throw E.validation({ user: 'Provide a role or active-status change' });

    const [[current]] = await pool.query('SELECT id, name, email, role, is_active FROM users WHERE id = ?', [id]);
    if (!current) throw E.notFound('User');
    const nextRole = data.role ?? current.role;
    const nextActive = Object.hasOwn(data, 'isActive') ? Number(data.isActive) : Boolean(current.is_active);
    const roleChanged = nextRole !== current.role;
    const activeChanged = nextActive !== Boolean(current.is_active);

    if (id === req.session.user.id && (nextRole !== 'admin' || !nextActive)) {
      throw E.conflict('You cannot change your own admin role or deactivate your own account', 'SELF_LOCKOUT');
    }
    if (!roleChanged && !activeChanged) return res.json(publicUser(current));

    await withTransaction(async (conn) => {
      await conn.query('UPDATE users SET role = ?, is_active = ? WHERE id = ?', [nextRole, nextActive ? 1 : 0, id]);
      // Remove any old role session so a changed or deactivated account cannot retain access.
      await conn.query(
        "DELETE FROM sessions WHERE CAST(JSON_UNQUOTE(JSON_EXTRACT(data, '$.user.id')) AS UNSIGNED) = ?",
        [id],
      );
    });

    if (roleChanged) await audit(req, 'ROLE_CHANGED', 'user', id, { from: current.role, to: nextRole });
    if (activeChanged) await audit(req, nextActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'user', id, { isActive: Boolean(nextActive) });
    return res.json({ id, name: current.name, email: current.email, role: nextRole, isActive: Boolean(nextActive) });
  } catch (err) {
    return next(err);
  }
});

// Restore the existing shared audit API contract with the genuine hash chain.
router.get('/audit', adminOnly, async (req, res, next) => {
  try {
    const paginated = Object.hasOwn(req.query, 'page') || Object.hasOwn(req.query, 'pageSize');
    const filters = validate(req.query, {
      action: { max: 80 }, userId: { type: 'int', min: 1 },
      limit: { type: 'int', min: 1, max: 500 },
      page: { type: 'int', min: 1 }, pageSize: { type: 'int', min: 1, max: 100 },
    });
    const where = []; const values = [];
    if (filters.action) { where.push('action = ?'); values.push(filters.action); }
    if (filters.userId) { where.push('user_id = ?'); values.push(filters.userId); }
    const condition = where.length ? `WHERE ${where.join(' AND ')}` : '';
    if (paginated) {
      const page = filters.page ?? 1; const pageSize = filters.pageSize ?? 50;
      const offset = (page - 1) * pageSize;
      if (!Number.isSafeInteger(page) || !Number.isSafeInteger(offset)) throw E.validation({ page: 'Page is too large' });
      const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM audit_logs ${condition}`, values);
      const [items] = await pool.query(
        `SELECT id, user_id, role, action, entity, entity_id, details, ip, created_at, prev_hash, hash
           FROM audit_logs ${condition} ORDER BY id DESC LIMIT ? OFFSET ?`, [...values, pageSize, offset],
      );
      return res.json({ items, page, pageSize, total: Number(total) });
    }
    const [rows] = await pool.query(
      `SELECT id, user_id AS userId, role, action, entity, entity_id AS entityId,
              details, ip, created_at AS createdAt, hash
         FROM audit_logs ${condition} ORDER BY id DESC LIMIT ?`, [...values, filters.limit ?? 100],
    );
    return res.json(rows);
  } catch (err) { return next(err); }
});
router.get('/audit/verify', adminOnly, async (_req, res, next) => {
  try { return res.json(await verifyChain()); }
  catch (err) { return next(err); }
});

module.exports = router;
