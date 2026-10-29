// M3 - HMS-F-009..012 complaints, assignment, progress/resolution, notifications
const router = require('express').Router();
const { pool } = require('../db');
const { E } = require('../utils/errors');
const { validate, parseId } = require('../utils/validate');
const { audit } = require('../utils/audit');
const { notify } = require('../utils/notify');
const { requireAuth, requireRole, STAFF } = require('../middleware/auth');

router.use(requireAuth);
const staff = requireRole(...STAFF);

const SELECT = `SELECT c.id, c.student_id AS studentId, su.name AS studentName, c.category_id AS categoryId, cc.name AS category,
  c.location, c.description, c.attachment_ref AS attachmentRef, c.priority, c.status, c.assigned_to AS assignedTo,
  mu.name AS assignedToName, c.resolution_details AS resolutionDetails, c.created_at AS createdAt,
  c.updated_at AS updatedAt, c.resolved_at AS resolvedAt
  FROM complaints c JOIN users su ON su.id = c.student_id JOIN complaint_categories cc ON cc.id = c.category_id
  LEFT JOIN users mu ON mu.id = c.assigned_to`;

// Allowed status transitions (HMS-F-011). Keys are current status.
const TRANSITIONS = { assigned: ['in_progress', 'resolved'], in_progress: ['resolved'], resolved: ['in_progress'] };

async function loadScoped(req, id) {
  const [[c]] = await pool.query(`${SELECT} WHERE c.id = ?`, [id]);
  if (!c) throw E.notFound('Complaint');
  const u = req.session.user;
  if (u.role === 'student' && c.studentId !== u.id) throw E.notFound('Complaint'); // do not reveal existence
  if (u.role === 'maintenance' && c.assignedTo !== u.id) throw E.notFound('Complaint');
  return c;
}

router.get('/complaint-categories', async (_req, res, next) => {
  try { const [rows] = await pool.query('SELECT id, name FROM complaint_categories WHERE is_active = 1 ORDER BY name'); res.json(rows); } catch (e) { next(e); }
});

router.post('/complaint-categories', staff, async (req, res, next) => {
  try {
    const d = validate(req.body, { name: { required: true, max: 60 } });
    const [r] = await pool.query('INSERT INTO complaint_categories (name) VALUES (?)', [d.name]);
    await audit(req, 'COMPLAINT_CATEGORY_CREATE', 'complaint_category', r.insertId, d);
    res.status(201).json({ id: r.insertId, name: d.name });
  } catch (e) { next(e); }
});

router.get('/maintenance-staff', staff, async (_req, res, next) => {
  try { const [rows] = await pool.query("SELECT id, name FROM users WHERE role = 'maintenance' AND is_active = 1 ORDER BY name"); res.json(rows); } catch (e) { next(e); }
});

// HMS-F-009 / TC-Comp-01
router.post('/complaints', requireRole('student'), async (req, res, next) => {
  try {
    const d = validate(req.body, {
      categoryId: { type: 'int', required: true, min: 1, label: 'Category' },
      location: { required: true, max: 120 }, description: { required: true, min: 5, max: 2000 }, attachmentRef: { max: 300 },
    });
    const [[cat]] = await pool.query('SELECT id FROM complaint_categories WHERE id = ? AND is_active = 1', [d.categoryId]);
    if (!cat) throw E.validation({ categoryId: 'Unknown complaint category' });
    const [r] = await pool.query('INSERT INTO complaints (student_id, category_id, location, description, attachment_ref) VALUES (?,?,?,?,?)',
      [req.session.user.id, d.categoryId, d.location, d.description, d.attachmentRef || null]);
    await audit(req, 'COMPLAINT_CREATE', 'complaint', r.insertId, { categoryId: d.categoryId });
    res.status(201).json({ complaintId: r.insertId, status: 'submitted' });
  } catch (e) { next(e); }
});

router.get('/complaints', async (req, res, next) => {
  try {
    const u = req.session.user; const where = []; const vals = [];
    if (u.role === 'student') { where.push('c.student_id = ?'); vals.push(u.id); }
    else if (u.role === 'maintenance') { where.push('c.assigned_to = ?'); vals.push(u.id); }
    if (req.query.status) { where.push('c.status = ?'); vals.push(String(req.query.status)); }
    const [rows] = await pool.query(`${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY c.id DESC LIMIT 500`, vals);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/complaints/:id', async (req, res, next) => {
  try { res.json(await loadScoped(req, parseId(req.params.id))); } catch (e) { next(e); }
});

// HMS-F-010 / TC-Comp-02 : assign to maintenance staff, set priority
router.post('/complaints/:id/assign', staff, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const d = validate(req.body, { assignedTo: { type: 'int', required: true, min: 1 }, priority: { enum: ['low', 'medium', 'high', 'urgent'] } });
    const [[m]] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'maintenance' AND is_active = 1", [d.assignedTo]);
    if (!m) throw E.validation({ assignedTo: 'Assignee must be an active maintenance staff member' });
    const [[c]] = await pool.query('SELECT id, status, student_id FROM complaints WHERE id = ?', [id]);
    if (!c) throw E.notFound('Complaint');
    if (c.status === 'resolved') throw E.conflict('Resolved complaints cannot be reassigned', 'INVALID_TRANSITION');
    // Re-assigning an in-progress complaint keeps its progress state; first assignment moves submitted -> assigned.
    const newStatus = c.status === 'submitted' ? 'assigned' : c.status;
    await pool.query('UPDATE complaints SET assigned_to = ?, status = ?, priority = COALESCE(?, priority) WHERE id = ?', [d.assignedTo, newStatus, d.priority || null, id]);
    await audit(req, 'COMPLAINT_ASSIGN', 'complaint', id, { assignedTo: d.assignedTo, priority: d.priority });
    await notify(c.student_id, 'complaint_assigned', `Your complaint #${id} has been assigned to maintenance staff.`, { type: 'complaint', id });
    await notify(d.assignedTo, 'complaint_assigned_to_you', `Complaint #${id} has been assigned to you.`, { type: 'complaint', id });
    res.json({ complaintId: id, status: newStatus, assignedTo: d.assignedTo, priority: d.priority });
  } catch (e) { next(e); }
});

// HMS-F-010: change priority on its own
router.patch('/complaints/:id/priority', staff, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const d = validate(req.body, { priority: { required: true, enum: ['low', 'medium', 'high', 'urgent'] } });
    const [r] = await pool.query('UPDATE complaints SET priority = ? WHERE id = ?', [d.priority, id]);
    if (!r.affectedRows) throw E.notFound('Complaint');
    await audit(req, 'COMPLAINT_PRIORITY', 'complaint', id, d);
    res.json({ complaintId: id, priority: d.priority });
  } catch (e) { next(e); }
});

// HMS-F-011 / TC-Comp-03 : only the assigned maintenance member (or warden/admin) may update
router.patch('/complaints/:id/status', requireRole('maintenance', ...STAFF), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const d = validate(req.body, { status: { required: true, enum: ['in_progress', 'resolved'] }, resolutionDetails: { max: 2000 } });
    const [[c]] = await pool.query('SELECT id, status, student_id, assigned_to FROM complaints WHERE id = ?', [id]);
    if (!c) throw E.notFound('Complaint');
    const u = req.session.user;
    if (u.role === 'maintenance' && c.assigned_to !== u.id) throw E.forbidden('This complaint is not assigned to you');
    if (!(TRANSITIONS[c.status] || []).includes(d.status)) throw E.conflict(`Cannot change status from ${c.status} to ${d.status}`, 'INVALID_TRANSITION');
    if (d.status === 'resolved' && !d.resolutionDetails) throw E.validation({ resolutionDetails: 'Resolution details are required to resolve a complaint' });
    await pool.query(
      `UPDATE complaints SET status = ?, resolution_details = COALESCE(?, resolution_details),
       resolved_at = ${d.status === 'resolved' ? 'NOW()' : 'NULL'} WHERE id = ?`, [d.status, d.resolutionDetails || null, id]);
    await audit(req, 'COMPLAINT_STATUS', 'complaint', id, { from: c.status, to: d.status });
    await notify(c.student_id, d.status === 'resolved' ? 'complaint_resolved' : 'complaint_updated',
      d.status === 'resolved' ? `Your complaint #${id} has been resolved.` : `Your complaint #${id} is now in progress.`, { type: 'complaint', id });
    const [[now]] = await pool.query('SELECT status, updated_at AS updatedAt FROM complaints WHERE id = ?', [id]);
    res.json({ complaintId: id, status: now.status, updatedAt: now.updatedAt });
  } catch (e) { next(e); }
});

module.exports = router;
