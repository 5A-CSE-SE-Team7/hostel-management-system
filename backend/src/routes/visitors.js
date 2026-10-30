// M4 - HMS-F-014 visitor records
const router = require('express').Router();
const { pool } = require('../db');
const { E } = require('../utils/errors');
const { validate, parseId } = require('../utils/validate');
const { audit } = require('../utils/audit');
const { notify } = require('../utils/notify');
const { requireAuth, requireRole, STAFF } = require('../middleware/auth');

router.use(requireAuth);

const SELECT = `SELECT v.id, v.student_id AS studentId, su.name AS studentName, v.visitor_name AS visitorName, v.id_type AS idType,
  v.id_number AS idNumber, v.relation, v.visit_at AS visitAt, v.purpose, v.status, v.remarks, v.created_at AS createdAt
  FROM visitors v JOIN users su ON su.id = v.student_id`;

router.post('/visitors', requireRole('student', ...STAFF), async (req, res, next) => {
  try {
    const u = req.session.user;
    const d = validate(req.body, {
      studentId: { type: 'int', min: 1 }, visitorName: { required: true, max: 120 }, idType: { required: true, max: 40 },
      idNumber: { required: true, max: 60 }, relation: { max: 60 }, visitAt: { type: 'datetime', required: true, label: 'Visit date/time' },
      purpose: { required: true, max: 200 }, status: { enum: ['pending', 'approved'] },
    });
    let studentId; let status = 'pending';
    if (u.role === 'student') { studentId = u.id; } // students can only register visitors for themselves, always pending
    else {
      if (!d.studentId) throw E.validation({ studentId: 'Student is required' });
      const [[s]] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'student'", [d.studentId]);
      if (!s) throw E.notFound('Student');
      studentId = d.studentId; status = d.status || 'approved';
    }
    const [r] = await pool.query(
      'INSERT INTO visitors (student_id, visitor_name, id_type, id_number, relation, visit_at, purpose, status, recorded_by) VALUES (?,?,?,?,?,?,?,?,?)',
      [studentId, d.visitorName, d.idType, d.idNumber, d.relation || null, d.visitAt, d.purpose, status, u.id]);
    await audit(req, 'VISITOR_CREATE', 'visitor', r.insertId, { studentId, status });
    res.status(201).json({ id: r.insertId, studentId, status });
  } catch (e) { next(e); }
});

router.get('/visitors', async (req, res, next) => {
  try {
    const u = req.session.user;
    if (u.role === 'maintenance') throw E.forbidden();
    const where = []; const vals = [];
    if (u.role === 'student') { where.push('v.student_id = ?'); vals.push(u.id); }
    if (req.query.status) { where.push('v.status = ?'); vals.push(String(req.query.status)); }
    if (req.query.from) { where.push('v.visit_at >= ?'); vals.push(`${String(req.query.from).slice(0, 10)} 00:00:00`); }
    if (req.query.to) { where.push('v.visit_at <= ?'); vals.push(`${String(req.query.to).slice(0, 10)} 23:59:59`); }
    const [rows] = await pool.query(`${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY v.visit_at DESC LIMIT 500`, vals);
    res.json(rows);
  } catch (e) { next(e); }
});

router.patch('/visitors/:id/status', requireRole(...STAFF), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const d = validate(req.body, { status: { required: true, enum: ['approved', 'rejected', 'completed'] }, remarks: { max: 300 } });
    const [[v]] = await pool.query('SELECT id, status, student_id FROM visitors WHERE id = ?', [id]);
    if (!v) throw E.notFound('Visitor record');
    const ok = { pending: ['approved', 'rejected'], approved: ['completed', 'rejected'] };
    if (!(ok[v.status] || []).includes(d.status)) throw E.conflict(`Cannot change visitor status from ${v.status} to ${d.status}`, 'INVALID_TRANSITION');
    await pool.query('UPDATE visitors SET status = ?, remarks = COALESCE(?, remarks) WHERE id = ?', [d.status, d.remarks || null, id]);
    await audit(req, 'VISITOR_STATUS', 'visitor', id, { from: v.status, to: d.status });
    await notify(v.student_id, 'visitor_update', `Your visitor request #${id} is now ${d.status}.`, { type: 'visitor', id });
    res.json({ id, status: d.status });
  } catch (e) { next(e); }
});

module.exports = router;
