// M4 - HMS-F-013 fee ledger (records only; payment-gateway processing is out of scope)
const router = require('express').Router();
const { pool } = require('../db');
const { E } = require('../utils/errors');
const { validate, parseId } = require('../utils/validate');
const { audit } = require('../utils/audit');
const { notify } = require('../utils/notify');
const { requireAuth, requireRole, STAFF } = require('../middleware/auth');

router.use(requireAuth);
const staff = requireRole(...STAFF);

// Proposal for issue #21 owner: reject invalid calendars before MySQL inserts.
function validateFee(body, rules) {
  const data = validate(body, rules);
  for (const field of ['dueDate', 'paidOn']) {
    if (data[field] && (data[field] < '1000-01-01' || new Date(data[field]).toISOString().slice(0, 10) !== data[field])) {
      throw E.validation({ [field]: 'Enter an existing calendar date (YYYY-MM-DD)' });
    }
  }
  return data;
}

async function ledger(studentId) {
  const [assessments] = await pool.query(
    `SELECT fa.id, fa.description, fa.amount, fa.due_date AS dueDate, fa.created_at AS createdAt,
            COALESCE((SELECT SUM(p.amount) FROM fee_payments p WHERE p.assessment_id = fa.id), 0) AS paid
     FROM fee_assessments fa WHERE fa.student_id = ? ORDER BY fa.due_date, fa.id`, [studentId]);
  const [payments] = await pool.query(
    'SELECT id, assessment_id AS assessmentId, amount, paid_on AS paidOn, reference FROM fee_payments WHERE student_id = ? ORDER BY paid_on, id', [studentId]);
  const r2 = (n) => Math.round(n * 100) / 100;
  const totalAssessed = r2(assessments.reduce((s, a) => s + a.amount, 0));
  const totalPaid = r2(payments.reduce((s, p) => s + p.amount, 0));
  return {
    studentId,
    assessments: assessments.map((a) => ({ ...a, outstanding: r2(a.amount - a.paid) })),
    payments,
    totals: { assessed: totalAssessed, paid: totalPaid, outstanding: r2(totalAssessed - totalPaid) },
  };
}

async function assertStudent(id) {
  const [[s]] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'student'", [id]);
  if (!s) throw E.notFound('Student');
}

router.post('/fees/assessments', staff, async (req, res, next) => {
  try {
    const d = validateFee(req.body, { studentId: { type: 'int', required: true, min: 1 }, description: { required: true, max: 200 },
      amount: { type: 'number', required: true, min: 0.01, max: 10000000 }, dueDate: { type: 'date', required: true } });
    await assertStudent(d.studentId);
    const [r] = await pool.query('INSERT INTO fee_assessments (student_id, description, amount, due_date, created_by) VALUES (?,?,?,?,?)',
      [d.studentId, d.description, d.amount.toFixed(2), d.dueDate, req.session.user.id]);
    await audit(req, 'FEE_ASSESSMENT', 'fee_assessment', r.insertId, { studentId: d.studentId, amount: d.amount });
    await notify(d.studentId, 'fee_assessed', `A hostel fee of ${d.amount.toFixed(2)} (${d.description}) is due on ${d.dueDate}.`, { type: 'fee', id: r.insertId });
    res.status(201).json({ id: r.insertId, ...d });
  } catch (e) { next(e); }
});

router.post('/fees/payments', staff, async (req, res, next) => {
  try {
    const d = validateFee(req.body, { studentId: { type: 'int', required: true, min: 1 }, assessmentId: { type: 'int', min: 1 },
      amount: { type: 'number', required: true, min: 0.01, max: 10000000 }, paidOn: { type: 'date', required: true }, reference: { max: 100 } });
    await assertStudent(d.studentId);
    if (d.assessmentId) {
      const [[a]] = await pool.query('SELECT id FROM fee_assessments WHERE id = ? AND student_id = ?', [d.assessmentId, d.studentId]);
      if (!a) throw E.validation({ assessmentId: 'Assessment does not belong to this student' });
    }
    const [r] = await pool.query('INSERT INTO fee_payments (student_id, assessment_id, amount, paid_on, reference, recorded_by) VALUES (?,?,?,?,?,?)',
      [d.studentId, d.assessmentId || null, d.amount.toFixed(2), d.paidOn, d.reference || null, req.session.user.id]);
    await audit(req, 'FEE_PAYMENT', 'fee_payment', r.insertId, { studentId: d.studentId, amount: d.amount });
    res.status(201).json({ id: r.insertId, ...d });
  } catch (e) { next(e); }
});

// Student: own ledger
router.get('/fees/me', requireRole('student'), async (req, res, next) => {
  try { res.json(await ledger(req.session.user.id)); } catch (e) { next(e); }
});

// Staff: any student's ledger (audited access to a critical record, HMS-SR-004)
router.get('/fees/ledger/:studentId', staff, async (req, res, next) => {
  try {
    const id = parseId(req.params.studentId, 'studentId');
    await assertStudent(id);
    await audit(req, 'FEE_LEDGER_VIEW', 'user', id, null);
    res.json(await ledger(id));
  } catch (e) { next(e); }
});

// Staff: students with outstanding balance
router.get('/fees/dues', staff, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id AS studentId, u.name, s.srn,
              COALESCE(a.total, 0) AS assessed, COALESCE(p.total, 0) AS paid, COALESCE(a.total, 0) - COALESCE(p.total, 0) AS outstanding
       FROM users u JOIN students s ON s.user_id = u.id
       LEFT JOIN (SELECT student_id, SUM(amount) total FROM fee_assessments GROUP BY student_id) a ON a.student_id = u.id
       LEFT JOIN (SELECT student_id, SUM(amount) total FROM fee_payments GROUP BY student_id) p ON p.student_id = u.id
       HAVING outstanding > 0 ORDER BY outstanding DESC LIMIT 500`);
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
