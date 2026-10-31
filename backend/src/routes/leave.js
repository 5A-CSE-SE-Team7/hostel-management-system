// M4 - HMS-F-015 leave/outpass workflow
const router = require('express').Router();
const { pool, withTransaction } = require('../db');
const { E } = require('../utils/errors');
const { validate, parseId } = require('../utils/validate');
const { audit } = require('../utils/audit');
const { notify } = require('../utils/notify');
const { requireAuth, requireRole, STAFF } = require('../middleware/auth');

router.use(requireAuth);

const SELECT = `SELECT l.id, l.student_id AS studentId, su.name AS studentName, l.type, l.from_at AS fromAt, l.to_at AS toAt,
  l.reason, l.destination, l.status, l.remarks, l.decided_by AS decidedBy, l.decided_at AS decidedAt, l.created_at AS createdAt
  FROM leave_requests l JOIN users su ON su.id = l.student_id`;

router.post('/leave', requireRole('student'), async (req, res, next) => {
  try {
    const d = validate(req.body, {
      type: { required: true, enum: ['leave', 'outpass'] }, fromAt: { type: 'datetime', required: true, label: 'From' },
      toAt: { type: 'datetime', required: true, label: 'To' }, reason: { required: true, min: 3, max: 300 }, destination: { max: 150 },
    });
    if (d.toAt <= d.fromAt) throw E.validation({ toAt: 'End must be after start' });
    const [r] = await pool.query('INSERT INTO leave_requests (student_id, type, from_at, to_at, reason, destination) VALUES (?,?,?,?,?,?)',
      [req.session.user.id, d.type, d.fromAt, d.toAt, d.reason, d.destination || null]);
    await audit(req, 'LEAVE_SUBMIT', 'leave', r.insertId, { type: d.type });
    res.status(201).json({ id: r.insertId, status: 'pending' });
  } catch (e) { next(e); }
});

router.get('/leave', async (req, res, next) => {
  try {
    const u = req.session.user;
    if (u.role === 'maintenance') throw E.forbidden();
    const where = []; const vals = [];
    if (u.role === 'student') { where.push('l.student_id = ?'); vals.push(u.id); }
    if (req.query.status) { where.push('l.status = ?'); vals.push(String(req.query.status)); }
    const [rows] = await pool.query(`${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY l.id DESC LIMIT 500`, vals);
    res.json(rows);
  } catch (e) { next(e); }
});

// Approve / reject with remarks - the ONLY way status leaves "pending" besides student cancel (AC-HMS-F015)
router.post('/leave/:id/decision', requireRole(...STAFF), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const d = validate(req.body, { decision: { required: true, enum: ['approved', 'rejected'] }, remarks: { max: 300 } });
    if (d.decision === 'rejected' && !d.remarks) throw E.validation({ remarks: 'Remarks are required when rejecting a request' });
    const studentId = await withTransaction(async (conn) => {
      const [[l]] = await conn.query('SELECT id, status, student_id FROM leave_requests WHERE id = ? FOR UPDATE', [id]);
      if (!l) throw E.notFound('Leave request');
      if (l.status !== 'pending') throw E.conflict(`Request is already ${l.status}`, 'INVALID_TRANSITION');
      await conn.query('UPDATE leave_requests SET status = ?, remarks = ?, decided_by = ?, decided_at = NOW() WHERE id = ?',
        [d.decision, d.remarks || null, req.session.user.id, id]);
      return l.student_id;
    });
    await audit(req, 'LEAVE_DECISION', 'leave', id, { decision: d.decision });
    await notify(studentId, 'leave_decision', `Your leave/outpass request #${id} was ${d.decision}.${d.remarks ? ` Remarks: ${d.remarks}` : ''}`, { type: 'leave', id });
    res.json({ id, status: d.decision, remarks: d.remarks || null });
  } catch (e) { next(e); }
});

router.post('/leave/:id/cancel', requireRole('student'), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const [r] = await pool.query("UPDATE leave_requests SET status = 'cancelled' WHERE id = ? AND student_id = ? AND status = 'pending'", [id, req.session.user.id]);
    if (!r.affectedRows) throw E.conflict('Only your own pending requests can be cancelled', 'INVALID_TRANSITION');
    await audit(req, 'LEAVE_CANCEL', 'leave', id, null);
    res.json({ id, status: 'cancelled' });
  } catch (e) { next(e); }
});

module.exports = router;
