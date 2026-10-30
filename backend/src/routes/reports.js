// M4 - HMS-F-016 administrative reports. GET /api/reports/:type?from=YYYY-MM-DD&to=YYYY-MM-DD[&format=csv]
const router = require('express').Router();
const { pool } = require('../db');
const { E } = require('../utils/errors');
const { validate } = require('../utils/validate');
const { audit } = require('../utils/audit');
const { requireRole, STAFF } = require('../middleware/auth');

router.use(requireRole(...STAFF));

const lo = (d) => `${d} 00:00:00`;
const hi = (d) => `${d} 23:59:59`;

const REPORTS = {
  async occupancy({ from, to }) {
    const [blocks] = await pool.query(
      `SELECT b.name AS block,
         COUNT(CASE WHEN bd.is_active = 1 AND r.is_active = 1 AND b.is_active = 1 THEN 1 END) AS totalBeds,
         COUNT(a.id) AS occupied
       FROM blocks b LEFT JOIN rooms r ON r.block_id = b.id LEFT JOIN beds bd ON bd.room_id = r.id
       LEFT JOIN allocations a ON a.bed_id = bd.id AND a.released_at IS NULL GROUP BY b.id, b.name ORDER BY b.name`);
    const [[alloc]] = await pool.query(
      `SELECT COUNT(*) AS newAllocations,
              SUM(status = 'transferred') AS transfers,
              SUM(check_in_date BETWEEN ? AND ?) AS checkIns,
              SUM(check_out_date BETWEEN ? AND ?) AS checkOuts
       FROM allocations WHERE allocated_at BETWEEN ? AND ?`, [from, to, from, to, lo(from), hi(to)]);
    const totalBeds = blocks.reduce((s, b) => s + b.totalBeds, 0); const occupied = blocks.reduce((s, b) => s + b.occupied, 0);
    return { occupancy: { totalBeds, occupied, available: totalBeds - occupied, byBlock: blocks },
      allocations: { newAllocations: alloc.newAllocations, transfers: Number(alloc.transfers || 0), checkIns: Number(alloc.checkIns || 0), checkOuts: Number(alloc.checkOuts || 0) } };
  },
  async allocations({ from, to }) {
    const [rows] = await pool.query(
      `SELECT a.id, su.name AS student, b.name AS block, r.room_number AS room, bd.label AS bed, a.status,
              a.allocated_at AS allocatedAt, a.check_in_date AS checkInDate, a.check_out_date AS checkOutDate
       FROM allocations a JOIN users su ON su.id = a.student_id JOIN beds bd ON bd.id = a.bed_id
       JOIN rooms r ON r.id = bd.room_id JOIN blocks b ON b.id = r.block_id
       WHERE a.allocated_at BETWEEN ? AND ? ORDER BY a.id`, [lo(from), hi(to)]);
    return { summary: { count: rows.length }, rows };
  },
  async complaints({ from, to }) {
    const [rows] = await pool.query(
      `SELECT c.id, su.name AS student, cc.name AS category, c.priority, c.status, c.created_at AS createdAt, c.resolved_at AS resolvedAt
       FROM complaints c JOIN users su ON su.id = c.student_id JOIN complaint_categories cc ON cc.id = c.category_id
       WHERE c.created_at BETWEEN ? AND ? ORDER BY c.id`, [lo(from), hi(to)]);
    const byStatus = rows.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] || 0) + 1 }), {});
    return { summary: { count: rows.length, byStatus }, rows };
  },
  async 'fee-dues'({ to }) {
    const [rows] = await pool.query(
      `SELECT u.id AS studentId, u.name AS student, s.srn,
              COALESCE(a.total, 0) AS assessed, COALESCE(p.total, 0) AS paid, COALESCE(a.total, 0) - COALESCE(p.total, 0) AS outstanding
       FROM users u JOIN students s ON s.user_id = u.id
       LEFT JOIN (SELECT student_id, SUM(amount) total FROM fee_assessments WHERE due_date <= ? GROUP BY student_id) a ON a.student_id = u.id
       LEFT JOIN (SELECT student_id, SUM(amount) total FROM fee_payments WHERE paid_on <= ? GROUP BY student_id) p ON p.student_id = u.id
       HAVING outstanding > 0 ORDER BY outstanding DESC`, [to, to]);
    return { summary: { students: rows.length, totalOutstanding: Math.round(rows.reduce((s, r) => s + r.outstanding, 0) * 100) / 100, note: 'Assessments due on/before the end date, less payments received on/before it' }, rows };
  },
  async visitors({ from, to }) {
    const [rows] = await pool.query(
      `SELECT v.id, su.name AS student, v.visitor_name AS visitor, v.purpose, v.visit_at AS visitAt, v.status
       FROM visitors v JOIN users su ON su.id = v.student_id WHERE v.visit_at BETWEEN ? AND ? ORDER BY v.visit_at`, [lo(from), hi(to)]);
    return { summary: { count: rows.length }, rows };
  },
  async leave({ from, to }) {
    const [rows] = await pool.query(
      `SELECT l.id, su.name AS student, l.type, l.from_at AS fromAt, l.to_at AS toAt, l.status, l.remarks
       FROM leave_requests l JOIN users su ON su.id = l.student_id WHERE l.created_at BETWEEN ? AND ? ORDER BY l.id`, [lo(from), hi(to)]);
    const byStatus = rows.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] || 0) + 1 }), {});
    return { summary: { count: rows.length, byStatus }, rows };
  },
};

const csvCell = (v) => {
  let s = v == null ? '' : String(v);
  // Export untrusted text as a literal cell, never a spreadsheet formula.
  // Genuine numeric values retain their numeric representation.
  if (typeof v === 'string' && /^\s*[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

router.get('/:type', async (req, res, next) => {
  try {
    const gen = Object.hasOwn(REPORTS, req.params.type) ? REPORTS[req.params.type] : null;
    if (!gen) throw E.notFound('Report type');
    const today = new Date().toISOString().slice(0, 10);
    const q = validate(req.query, { from: { type: 'date' }, to: { type: 'date' }, format: { enum: ['json', 'csv'] } });
    const period = { from: q.from || `${today.slice(0, 8)}01`, to: q.to || today };
    if (period.from > period.to) throw E.validation({ from: 'Start date must not be after end date' }, 'Invalid period');
    const data = await gen(period);
    await audit(req, 'REPORT_GENERATE', 'report', req.params.type, period);
    if (q.format === 'csv') {
      const rows = data.rows || data.occupancy?.byBlock || [];
      const cols = rows.length ? Object.keys(rows[0]) : [];
      res.type('text/csv').send([cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n'));
      return;
    }
    res.json({ type: req.params.type, period, ...data });
  } catch (e) { next(e); }
});

module.exports = router;
