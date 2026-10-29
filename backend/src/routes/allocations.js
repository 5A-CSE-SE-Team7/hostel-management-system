// M2 - HMS-F-006 allocate, HMS-F-007 atomic transfer, HMS-F-008 check-in/out + occupancy
const router = require('express').Router();
const { pool, withTransaction } = require('../db');
const { E } = require('../utils/errors');
const { validate, parseId } = require('../utils/validate');
const { audit } = require('../utils/audit');
const { notify } = require('../utils/notify');
const { requireAuth, requireRole, STAFF } = require('../middleware/auth');

router.use(requireAuth);
const staff = requireRole(...STAFF);

const ALLOC_SELECT = `SELECT a.id, a.student_id AS studentId, su.name AS studentName, s.srn, a.bed_id AS bedId, bd.label AS bedLabel,
  r.room_number AS roomNumber, b.name AS blockName, a.status, a.allocated_at AS allocatedAt,
  a.check_in_date AS checkInDate, a.check_out_date AS checkOutDate, a.released_at AS releasedAt
  FROM allocations a JOIN users su ON su.id = a.student_id LEFT JOIN students s ON s.user_id = a.student_id
  JOIN beds bd ON bd.id = a.bed_id JOIN rooms r ON r.id = bd.room_id JOIN blocks b ON b.id = r.block_id`;

/** Locks and validates a bed as allocatable inside the caller's transaction. */
async function lockAvailableBed(conn, bedId) {
  const [[bed]] = await conn.query(
    `SELECT bd.id, bd.is_active AS bedActive, r.is_active AS roomActive, b.is_active AS blockActive
     FROM beds bd JOIN rooms r ON r.id = bd.room_id JOIN blocks b ON b.id = r.block_id WHERE bd.id = ? FOR UPDATE`, [bedId]);
  if (!bed) throw E.notFound('Bed');
  if (!bed.bedActive || !bed.roomActive || !bed.blockActive) throw E.conflict('Bed is not active', 'BED_UNAVAILABLE');
  const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM allocations WHERE bed_id = ? AND released_at IS NULL', [bedId]);
  if (n > 0) throw E.conflict('Bed is already allocated', 'BED_UNAVAILABLE');
}

const wrapDup = (err) => {
  if (err.code === 'ER_DUP_ENTRY') return E.conflict('Bed or student already has a current allocation', 'BED_UNAVAILABLE');
  return err;
};

// HMS-F-006 / TC-Room-02
router.post('/allocations', staff, async (req, res, next) => {
  try {
    const d = validate(req.body, { studentId: { type: 'int', required: true, min: 1 }, bedId: { type: 'int', required: true, min: 1 }, checkInDate: { type: 'date' } });
    const out = await withTransaction(async (conn) => {
      const [[stu]] = await conn.query("SELECT id, is_active FROM users WHERE id = ? AND role = 'student' FOR UPDATE", [d.studentId]);
      if (!stu) throw E.notFound('Student');
      if (!stu.is_active) throw E.conflict('Student account is inactive', 'STUDENT_INELIGIBLE');
      const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM allocations WHERE student_id = ? AND released_at IS NULL', [d.studentId]);
      if (n > 0) throw E.conflict('Student already has a current allocation', 'STUDENT_INELIGIBLE');
      await lockAvailableBed(conn, d.bedId);
      const status = d.checkInDate ? 'checked_in' : 'allocated';
      const [r] = await conn.query('INSERT INTO allocations (student_id, bed_id, status, check_in_date, allocated_by) VALUES (?,?,?,?,?)',
        [d.studentId, d.bedId, status, d.checkInDate || null, req.session.user.id]);
      return { allocationId: r.insertId, studentId: d.studentId, bedId: d.bedId, status };
    }).catch((e) => { throw wrapDup(e); });
    await audit(req, 'ALLOCATION_CREATE', 'allocation', out.allocationId, { studentId: d.studentId, bedId: d.bedId });
    await notify(d.studentId, 'room_allocated', 'A hostel bed has been allocated to you. Check "My room" for details.', { type: 'allocation', id: out.allocationId });
    res.status(201).json(out);
  } catch (e) { next(e); }
});

// HMS-F-007 / TC-Room-03 - release old + record new in ONE transaction
router.post('/allocations/:id/transfer', staff, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const d = validate(req.body, { targetBedId: { type: 'int', required: true, min: 1 } });
    const out = await withTransaction(async (conn) => {
      const [[cur]] = await conn.query('SELECT * FROM allocations WHERE id = ? FOR UPDATE', [id]);
      if (!cur) throw E.notFound('Allocation');
      if (cur.released_at) throw E.conflict('Allocation is no longer current', 'ALLOCATION_NOT_CURRENT');
      if (cur.bed_id === d.targetBedId) throw E.conflict('Student is already in that bed', 'BED_UNAVAILABLE');
      await lockAvailableBed(conn, d.targetBedId);
      await conn.query("UPDATE allocations SET released_at = NOW(), status = 'transferred' WHERE id = ?", [id]);
      const status = cur.status === 'checked_in' ? 'checked_in' : 'allocated';
      const [r] = await conn.query('INSERT INTO allocations (student_id, bed_id, status, check_in_date, allocated_by) VALUES (?,?,?,?,?)',
        [cur.student_id, d.targetBedId, status, cur.check_in_date, req.session.user.id]);
      return { allocationId: r.insertId, oldBedReleased: true, newBedId: d.targetBedId, previousBedId: cur.bed_id, studentId: cur.student_id };
    }).catch((e) => { throw wrapDup(e); });
    await audit(req, 'ALLOCATION_TRANSFER', 'allocation', out.allocationId, { from: id, previousBedId: out.previousBedId, newBedId: out.newBedId });
    await notify(out.studentId, 'room_transferred', 'Your hostel bed allocation has been changed. Check "My room" for details.', { type: 'allocation', id: out.allocationId });
    const { previousBedId, studentId, ...body } = out;
    res.json(body);
  } catch (e) { next(e); }
});

// HMS-F-008 / TC-Room-04
router.post('/allocations/:id/check-in', staff, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const d = validate(req.body, { date: { type: 'date' } });
    const date = d.date || new Date().toISOString().slice(0, 10);
    const [[cur]] = await pool.query('SELECT status, released_at FROM allocations WHERE id = ?', [id]);
    if (!cur) throw E.notFound('Allocation');
    if (cur.released_at || cur.status !== 'allocated') throw E.conflict('Only a current, not-yet-checked-in allocation can be checked in', 'INVALID_STATE');
    await pool.query("UPDATE allocations SET status = 'checked_in', check_in_date = ? WHERE id = ?", [date, id]);
    await audit(req, 'CHECK_IN', 'allocation', id, { date });
    res.json({ id, status: 'checked_in', checkInDate: date });
  } catch (e) { next(e); }
});

router.post('/allocations/:id/check-out', staff, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const d = validate(req.body, { date: { type: 'date' } });
    const date = d.date || new Date().toISOString().slice(0, 10);
    await withTransaction(async (conn) => {
      const [[cur]] = await conn.query('SELECT status, released_at, check_in_date FROM allocations WHERE id = ? FOR UPDATE', [id]);
      if (!cur) throw E.notFound('Allocation');
      if (cur.released_at || cur.status !== 'checked_in') throw E.conflict('Only a checked-in allocation can be checked out', 'INVALID_STATE');
      if (cur.check_in_date && date < cur.check_in_date) throw E.validation({ date: 'Check-out cannot be before check-in' });
      await conn.query("UPDATE allocations SET status = 'checked_out', check_out_date = ?, released_at = NOW() WHERE id = ?", [date, id]);
    });
    await audit(req, 'CHECK_OUT', 'allocation', id, { date });
    res.json({ id, status: 'checked_out', checkOutDate: date });
  } catch (e) { next(e); }
});

// Staff: list allocations (current or history)
router.get('/allocations', staff, async (req, res, next) => {
  try {
    const where = []; const vals = [];
    if (req.query.scope === 'history') where.push('a.released_at IS NOT NULL'); else if (req.query.scope !== 'all') where.push('a.released_at IS NULL');
    if (req.query.studentId) { where.push('a.student_id = ?'); vals.push(parseId(req.query.studentId, 'studentId')); }
    const [rows] = await pool.query(`${ALLOC_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY a.id DESC LIMIT 500`, vals);
    res.json(rows);
  } catch (e) { next(e); }
});

// Student: own room + history ("View Room & Allocation" use case)
router.get('/me/room', requireRole('student'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(`${ALLOC_SELECT} WHERE a.student_id = ? ORDER BY a.id DESC`, [req.session.user.id]);
    res.json({ current: rows.find((r) => !r.releasedAt) || null, history: rows.filter((r) => r.releasedAt) });
  } catch (e) { next(e); }
});

// Current occupancy status for authorized users
router.get('/occupancy', staff, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.id AS blockId, b.name AS blockName,
         COUNT(CASE WHEN bd.is_active = 1 AND r.is_active = 1 AND b.is_active = 1 THEN 1 END) AS totalBeds,
         COUNT(a.id) AS occupied
       FROM blocks b LEFT JOIN rooms r ON r.block_id = b.id LEFT JOIN beds bd ON bd.room_id = r.id
       LEFT JOIN allocations a ON a.bed_id = bd.id AND a.released_at IS NULL
       GROUP BY b.id, b.name ORDER BY b.name`);
    const blocks = rows.map((r) => ({ ...r, available: Math.max(r.totalBeds - r.occupied, 0) }));
    res.json({ totalBeds: blocks.reduce((s, b) => s + b.totalBeds, 0), occupied: blocks.reduce((s, b) => s + b.occupied, 0), blocks });
  } catch (e) { next(e); }
});

module.exports = router;
