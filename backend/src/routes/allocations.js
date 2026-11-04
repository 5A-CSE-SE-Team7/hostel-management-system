const express = require('express');
const { pool, withTransaction } = require('../db');
const { E } = require('../utils/errors');
const { validate, parseId } = require('../utils/validate');
const { audit } = require('../utils/audit');

const router = express.Router();

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.session?.user) return next(E.unauthenticated());
    if (!roles.includes(req.session.user.role)) return next(E.forbidden());
    return next();
  };
}

function run(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.get('/beds/available', requireRole('admin', 'warden'), run(async (_req, res) => {
  const [beds] = await pool.query(`
    SELECT d.id AS bed_id, d.label, r.id AS room_id, r.room_number, r.floor,
           b.id AS block_id, b.name AS block_name
      FROM beds d
      JOIN rooms r ON r.id = d.room_id AND r.is_active = 1
      JOIN blocks b ON b.id = r.block_id AND b.is_active = 1
     WHERE d.is_active = 1
       AND NOT EXISTS (
         SELECT 1 FROM allocations a WHERE a.bed_id = d.id AND a.released_at IS NULL
       )
     ORDER BY b.name, r.room_number, d.label`);
  res.json(beds.map((bed) => ({
    id: bed.bed_id,
    label: bed.label,
    room: { id: bed.room_id, roomNumber: bed.room_number, floor: bed.floor },
    block: { id: bed.block_id, name: bed.block_name },
  })));
}));

router.get('/occupancy', requireRole('admin', 'warden'), run(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT b.id AS block_id, b.name AS block_name,
           COUNT(d.id) AS total_beds,
           COALESCE(SUM(a.id IS NOT NULL), 0) AS occupied_beds
      FROM blocks b
      LEFT JOIN rooms r ON r.block_id = b.id AND r.is_active = 1
      LEFT JOIN beds d ON d.room_id = r.id AND d.is_active = 1
      LEFT JOIN allocations a ON a.bed_id = d.id AND a.released_at IS NULL
     WHERE b.is_active = 1
     GROUP BY b.id, b.name
     ORDER BY b.name`);

  const blocks = rows.map((row) => ({
    blockId: row.block_id,
    blockName: row.block_name,
    totalBeds: Number(row.total_beds),
    occupiedBeds: Number(row.occupied_beds),
    availableBeds: Number(row.total_beds) - Number(row.occupied_beds),
  }));
  const totalBeds = blocks.reduce((sum, block) => sum + block.totalBeds, 0);
  const occupiedBeds = blocks.reduce((sum, block) => sum + block.occupiedBeds, 0);
  res.json({
    totalBeds,
    occupiedBeds,
    availableBeds: totalBeds - occupiedBeds,
    occupancyPercent: totalBeds ? Math.round((occupiedBeds / totalBeds) * 10000) / 100 : 0,
    blocks,
  });
}));

router.get('/allocations', requireRole('admin', 'warden'), run(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT a.id AS allocation_id, a.student_id, u.name AS student_name, a.bed_id, d.label AS bed_label,
           r.room_number, b.name AS block_name, a.status, a.allocated_at
      FROM allocations a
      JOIN users u ON u.id = a.student_id
      JOIN beds d ON d.id = a.bed_id
      JOIN rooms r ON r.id = d.room_id
      JOIN blocks b ON b.id = r.block_id
     WHERE a.released_at IS NULL
     ORDER BY b.name, r.room_number, d.label
     LIMIT 500`);
  res.json(rows.map((row) => ({
    id: row.allocation_id,
    studentId: row.student_id,
    studentName: row.student_name,
    bedId: row.bed_id,
    bedLabel: row.bed_label,
    roomNumber: row.room_number,
    blockName: row.block_name,
    status: row.status,
    allocatedAt: row.allocated_at,
  })));
}));

router.get('/me/room', requireRole('student'), run(async (req, res) => {
  const studentId = req.session.user.id;
  const [[allocation]] = await pool.query(`
    SELECT a.id AS allocation_id, a.status, a.allocated_at,
           d.id AS bed_id, d.label AS bed_label,
           r.id AS room_id, r.room_number, r.floor,
           b.id AS block_id, b.name AS block_name
      FROM allocations a
      JOIN beds d ON d.id = a.bed_id
      JOIN rooms r ON r.id = d.room_id
      JOIN blocks b ON b.id = r.block_id
     WHERE a.student_id = ? AND a.released_at IS NULL
     LIMIT 1`, [studentId]);

  if (!allocation) return res.json({ allocation: null });
  res.json({
    allocation: {
      id: allocation.allocation_id,
      status: allocation.status,
      allocatedAt: allocation.allocated_at,
      block: { id: allocation.block_id, name: allocation.block_name },
      room: { id: allocation.room_id, roomNumber: allocation.room_number, floor: allocation.floor },
      bed: { id: allocation.bed_id, label: allocation.bed_label },
    },
  });
}));

router.post('/allocations', requireRole('admin', 'warden'), run(async (req, res) => {
  const { studentId, bedId } = validate(req.body, {
    studentId: { required: true, type: 'int', min: 1 },
    bedId: { required: true, type: 'int', min: 1 },
  });
  const actor = req.session.user;

  const allocationId = await withTransaction(async (conn) => {
    // Lock the bed and its parent chain so concurrent allocations/deactivation
    // serialize on the same inventory rows.
    const [bedChain] = await conn.query(`
      SELECT d.id AS bed_id, d.is_active AS bed_active,
             r.id AS room_id, r.is_active AS room_active,
             b.id AS block_id, b.is_active AS block_active
        FROM beds d
        JOIN rooms r ON r.id = d.room_id
        JOIN blocks b ON b.id = r.block_id
       WHERE d.id = ? FOR UPDATE`, [bedId]);
    if (!bedChain.length) throw E.notFound('Bed');
    const chain = bedChain[0];
    if (!chain.block_active || !chain.room_active || !chain.bed_active) {
      throw E.conflict('Bed, room, and block must all be active', 'INACTIVE_BED');
    }

    const [users] = await conn.query(
      'SELECT id, role, is_active FROM users WHERE id = ? FOR UPDATE', [studentId]
    );
    if (!users.length || users[0].role !== 'student' || !users[0].is_active) {
      throw E.validation({ studentId: 'An active student account is required' });
    }
    const [studentRows] = await conn.query('SELECT user_id FROM students WHERE user_id = ?', [studentId]);
    if (!studentRows.length) throw E.validation({ studentId: 'Student profile not found' });

    const [currentBed] = await conn.query(
      'SELECT id FROM allocations WHERE bed_id = ? AND released_at IS NULL LIMIT 1 FOR UPDATE', [bedId]
    );
    if (currentBed.length) throw E.conflict('Bed is already allocated', 'OCCUPIED');

    const [currentStudent] = await conn.query(
      'SELECT id FROM allocations WHERE student_id = ? AND released_at IS NULL LIMIT 1 FOR UPDATE', [studentId]
    );
    if (currentStudent.length) throw E.conflict('Student already has a current allocation', 'ALREADY_ALLOCATED');

    const [insert] = await conn.query(
      `INSERT INTO allocations (student_id, bed_id, status, allocated_by)
       VALUES (?, ?, 'allocated', ?)`,
      [studentId, bedId, actor.id]
    );

    await conn.query(
      `INSERT INTO notifications (user_id, type, message, ref_type, ref_id)
       VALUES (?, 'allocation', ?, 'allocation', ?)`,
      [studentId, 'A bed has been allocated to you. View your room assignment for details.', insert.insertId]
    );

    await audit({
      user_id: actor.id,
      role: actor.role,
      action: 'ALLOCATION_CREATE',
      entity: 'allocation',
      entity_id: insert.insertId,
      details: { studentId, bedId },
      ip: req.ip,
    }, conn);

    return insert.insertId;
  });

  const [[allocation]] = await pool.query(
    'SELECT id, student_id, bed_id, status, allocated_at, allocated_by FROM allocations WHERE id = ?',
    [allocationId]
  );
  res.status(201).json({
    id: allocation.id,
    studentId: allocation.student_id,
    bedId: allocation.bed_id,
    status: allocation.status,
    allocatedAt: allocation.allocated_at,
    allocatedBy: allocation.allocated_by,
  });
}));

router.post('/allocations/:id/transfer', requireRole('admin', 'warden'), run(async (req, res) => {
  const allocationId = parseId(req.params.id, 'allocationId');
  const { targetBedId } = validate(req.body, {
    targetBedId: { required: true, type: 'int', min: 1 },
  });
  const actor = req.session.user;

  const transfer = await withTransaction(async (conn) => {
    const [currentRows] = await conn.query(
      `SELECT id, student_id, bed_id, status, check_in_date FROM allocations
        WHERE id = ? AND released_at IS NULL FOR UPDATE`, [allocationId]
    );
    if (!currentRows.length) throw E.notFound('Current allocation');
    const current = currentRows[0];
    if (!['allocated', 'checked_in'].includes(current.status)) {
      throw E.conflict('Only an active allocation can be transferred', 'ALLOCATION_NOT_ACTIVE');
    }
    if (Number(current.bed_id) === targetBedId) {
      throw E.conflict('The student is already assigned to this bed', 'SAME_BED');
    }

    const [targetChainRows] = await conn.query(`
      SELECT d.id AS bed_id, d.is_active AS bed_active,
             r.is_active AS room_active, b.is_active AS block_active
        FROM beds d
        JOIN rooms r ON r.id = d.room_id
        JOIN blocks b ON b.id = r.block_id
       WHERE d.id = ? FOR UPDATE`, [targetBedId]);
    if (!targetChainRows.length) throw E.notFound('Target bed');
    const target = targetChainRows[0];
    if (!target.block_active || !target.room_active || !target.bed_active) {
      throw E.conflict('Target bed, room, and block must all be active', 'INACTIVE_BED');
    }

    const [targetAllocations] = await conn.query(
      'SELECT id FROM allocations WHERE bed_id = ? AND released_at IS NULL LIMIT 1 FOR UPDATE', [targetBedId]
    );
    if (targetAllocations.length) throw E.conflict('Target bed is already allocated', 'OCCUPIED');

    const [released] = await conn.query(
      `UPDATE allocations SET status = 'transferred', released_at = NOW()
        WHERE id = ? AND released_at IS NULL`, [allocationId]
    );
    if (released.affectedRows !== 1) throw E.conflict('Allocation changed during transfer', 'ALLOCATION_CHANGED');

    const [insert] = await conn.query(
      `INSERT INTO allocations (student_id, bed_id, status, check_in_date, allocated_by)
       VALUES (?, ?, ?, ?, ?)`,
      [current.student_id, targetBedId, current.status, current.status === 'checked_in' ? current.check_in_date : null, actor.id]
    );
    await conn.query(
      `INSERT INTO notifications (user_id, type, message, ref_type, ref_id)
       VALUES (?, 'allocation_transfer', ?, 'allocation', ?)`,
      [current.student_id, 'Your room assignment has been transferred to a new bed.', insert.insertId]
    );
    await audit({
      user_id: actor.id,
      role: actor.role,
      action: 'ALLOCATION_TRANSFER',
      entity: 'allocation',
      entity_id: insert.insertId,
      details: { previousAllocationId: allocationId, studentId: current.student_id, previousBedId: current.bed_id, targetBedId },
      ip: req.ip,
    }, conn);

    return {
      previousAllocationId: allocationId,
      allocationId: insert.insertId,
      studentId: current.student_id,
      previousBedId: current.bed_id,
      bedId: targetBedId,
      status: current.status,
    };
  });

  res.json(transfer);
}));

module.exports = router;
