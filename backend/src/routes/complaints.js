// HMS-F-009: submission and role-scoped tracking. M1/M2 own auth/audit.
const router = require('express').Router();
const { pool, withTransaction } = require('../db');
const { E } = require('../utils/errors');
const { validate } = require('../utils/validate');
const { audit } = require('../utils/audit');
const { requireAuth, requireRole } = require('../middleware/auth');
const roles = ['student', 'warden', 'admin', 'maintenance'];
const statuses = ['submitted', 'assigned', 'in_progress', 'resolved'];
const SELECT = `SELECT c.id, c.student_id AS studentId, cc.name AS category,
  c.category_id AS categoryId, c.location, c.description, c.attachment_ref AS attachmentRef,
  c.priority, c.status, c.assigned_to AS assignedTo, mu.name AS assignedToName,
  c.resolution_details AS resolutionDetails, c.created_at AS createdAt, c.updated_at AS updatedAt,
  c.resolved_at AS resolvedAt FROM complaints c
  JOIN complaint_categories cc ON cc.id = c.category_id
  LEFT JOIN users mu ON mu.id = c.assigned_to`;
function id(value, field) {
  if (!['string', 'number'].includes(typeof value) || !/^[1-9][0-9]*$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > 4294967295) {
    throw E.validation({ [field]: `${field} must be a positive integer` });
  }
  return Number(value);
}
function scope(user) {
  if (user.role === 'student') return ['c.student_id = ?', [user.id]];
  if (user.role === 'maintenance') return ['c.assigned_to = ?', [user.id]];
  return ['1 = 1', []];
}
router.use(requireAuth, requireRole(...roles));
router.get('/complaint-categories', async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM complaint_categories WHERE is_active = 1 ORDER BY name');
    res.json(rows);
  } catch (error) { next(error); }
});
router.post('/complaints', requireRole('student'), async (req, res, next) => {
  try {
    const d = validate(req.body, {
      category: { max: 60 },
      location: { required: true, max: 120 },
      description: { required: true, min: 5, max: 2000 },
      attachmentRef: { max: 300 },
    });
    const categoryId = req.body?.categoryId == null ? null : id(req.body.categoryId, 'categoryId');
    if (!categoryId && !d.category) throw E.validation({ categoryId: 'Choose a complaint category' });
    const complaintId = await withTransaction(async conn => {
      // Share-lock the category through insertion; a concurrent deactivation
      // cannot invalidate the category after its active state was checked.
      const [[category]] = await conn.query(
        `SELECT id, name FROM complaint_categories WHERE ${categoryId ? 'id = ?' : 'name = ?'} AND is_active = 1 FOR SHARE`,
        [categoryId || d.category]);
      if (!category || (d.category && category.name !== d.category)) throw E.validation({ categoryId: 'Unknown or inactive complaint category' });
      const [result] = await conn.query(
        'INSERT INTO complaints (student_id, category_id, location, description, attachment_ref) VALUES (?,?,?,?,?)',
        [req.session.user.id, category.id, d.location, d.description, d.attachmentRef || null]);
      // Use the genuine M2 transaction contract: no unaudited success on error.
      await audit(req, 'COMPLAINT_CREATE', 'complaint', result.insertId, { categoryId: category.id }, { conn, strict: true });
      return result.insertId;
    });
    res.status(201).json({ complaintId, status: 'submitted' });
  } catch (error) { next(error); }
});
router.get('/complaints', async (req, res, next) => {
  try {
    const [where, values] = scope(req.session.user);
    const filter = req.query.status;
    if (filter !== undefined && (typeof filter !== 'string' || !statuses.includes(filter))) throw E.validation({ status: 'Unknown complaint status' });
    const before = req.query.before === undefined ? null : id(req.query.before, 'before');
    const limit = req.query.limit === undefined ? 100 : id(req.query.limit, 'limit');
    if (limit > 500) throw E.validation({ limit: 'limit must be <= 500' });
    const conditions = [where];
    if (filter) { conditions.push('c.status = ?'); values.push(filter); }
    if (before) { conditions.push('c.id < ?'); values.push(before); }
    const [rows] = await pool.query(`${SELECT} WHERE ${conditions.join(' AND ')} ORDER BY c.id DESC LIMIT ?`, [...values, limit]);
    res.json(rows);
  } catch (error) { next(error); }
});
router.get('/complaints/:id', async (req, res, next) => {
  try {
    const [where, values] = scope(req.session.user);
    const [[row]] = await pool.query(`${SELECT} WHERE c.id = ? AND ${where}`, [id(req.params.id, 'id'), ...values]);
    if (!row) throw E.notFound('Complaint');
    res.json(row);
  } catch (error) { next(error); }
});
// HMS-F-010: serialized assignment and independent priority changes.
const staff = requireRole('warden', 'admin');
router.get('/maintenance-staff', staff, async (_req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT id, name FROM users WHERE role = 'maintenance' AND is_active = 1 ORDER BY name, id");
    res.json(rows);
  } catch (error) { next(error); }
});
router.post('/complaints/:id/assign', staff, async (req, res, next) => {
  try {
    const complaintId = id(req.params.id, 'id');
    const assignedTo = id(req.body?.assignedTo, 'assignedTo');
    const d = validate(req.body, { priority: { enum: ['low', 'medium', 'high', 'urgent'] } });
    const result = await withTransaction(async conn => {
      const [[complaint]] = await conn.query('SELECT status, priority FROM complaints WHERE id = ? FOR UPDATE', [complaintId]);
      if (!complaint) throw E.notFound('Complaint');
      if (complaint.status === 'resolved') throw E.conflict('Resolved complaints cannot be reassigned', 'INVALID_TRANSITION');
      const [[assignee]] = await conn.query("SELECT id FROM users WHERE id = ? AND role = 'maintenance' AND is_active = 1 FOR SHARE", [assignedTo]);
      if (!assignee) throw E.validation({ assignedTo: 'Assignee must be an active maintenance staff member' });
      const status = complaint.status === 'submitted' ? 'assigned' : complaint.status;
      const priority = d.priority || complaint.priority;
      await conn.query('UPDATE complaints SET assigned_to = ?, status = ?, priority = ? WHERE id = ?', [assignedTo, status, priority, complaintId]);
      await audit(req, 'COMPLAINT_ASSIGN', 'complaint', complaintId, { assignedTo, priority }, { conn, strict: true });
      return { complaintId, status, assignedTo, priority };
    });
    res.json(result);
  } catch (error) { next(error); }
});
router.patch('/complaints/:id/priority', staff, async (req, res, next) => {
  try {
    const complaintId = id(req.params.id, 'id');
    const d = validate(req.body, { priority: { required: true, enum: ['low', 'medium', 'high', 'urgent'] } });
    await withTransaction(async conn => {
      const [[complaint]] = await conn.query('SELECT id FROM complaints WHERE id = ? FOR UPDATE', [complaintId]);
      if (!complaint) throw E.notFound('Complaint');
      await conn.query('UPDATE complaints SET priority = ? WHERE id = ?', [d.priority, complaintId]);
      await audit(req, 'COMPLAINT_PRIORITY', 'complaint', complaintId, d, { conn, strict: true });
    });
    res.json({ complaintId, priority: d.priority });
  } catch (error) { next(error); }
});
module.exports = router;
