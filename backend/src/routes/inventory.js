// M2 - HMS-F-005 hostel block / room / bed inventory CRUD (+ deactivate)
const router = require('express').Router();
const { pool, withTransaction } = require('../db');
const { E } = require('../utils/errors');
const { validate, parseId } = require('../utils/validate');
const { audit } = require('../utils/audit');
const { requireAuth, requireRole, STAFF } = require('../middleware/auth');

router.use(requireAuth);

// Full tree with occupancy for staff dashboards.
router.get('/inventory', requireRole(...STAFF), async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.id AS blockId, b.name AS blockName, b.is_active AS blockActive,
              r.id AS roomId, r.room_number AS roomNumber, r.floor, r.is_active AS roomActive,
              bd.id AS bedId, bd.label AS bedLabel, bd.is_active AS bedActive,
              a.id AS allocationId, a.student_id AS studentId, u.name AS studentName
       FROM blocks b
       LEFT JOIN rooms r ON r.block_id = b.id
       LEFT JOIN beds bd ON bd.room_id = r.id
       LEFT JOIN allocations a ON a.bed_id = bd.id AND a.released_at IS NULL
       LEFT JOIN users u ON u.id = a.student_id
       ORDER BY b.name, r.room_number, bd.label`);
    const blocks = new Map();
    for (const x of rows) {
      if (!blocks.has(x.blockId)) blocks.set(x.blockId, { id: x.blockId, name: x.blockName, isActive: !!x.blockActive, rooms: new Map() });
      const b = blocks.get(x.blockId);
      if (x.roomId) {
        if (!b.rooms.has(x.roomId)) b.rooms.set(x.roomId, { id: x.roomId, roomNumber: x.roomNumber, floor: x.floor, isActive: !!x.roomActive, beds: [] });
        if (x.bedId) {
          b.rooms.get(x.roomId).beds.push({ id: x.bedId, label: x.bedLabel, isActive: !!x.bedActive,
            occupied: !!x.allocationId, occupant: x.allocationId ? { studentId: x.studentId, name: x.studentName, allocationId: x.allocationId } : null });
        }
      }
    }
    res.json([...blocks.values()].map((b) => ({ ...b, rooms: [...b.rooms.values()] })));
  } catch (e) { next(e); }
});

router.get('/beds/available', requireRole(...STAFF), async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT bd.id, bd.label, r.room_number AS roomNumber, b.name AS blockName
       FROM beds bd JOIN rooms r ON r.id = bd.room_id JOIN blocks b ON b.id = r.block_id
       WHERE bd.is_active = 1 AND r.is_active = 1 AND b.is_active = 1
         AND NOT EXISTS (SELECT 1 FROM allocations a WHERE a.bed_id = bd.id AND a.released_at IS NULL)
       ORDER BY b.name, r.room_number, bd.label`);
    res.json(rows);
  } catch (e) { next(e); }
});

const staff = requireRole(...STAFF);

// ---- blocks
router.post('/blocks', staff, async (req, res, next) => {
  try {
    const d = validate(req.body, { name: { required: true, max: 60 } });
    const [r] = await pool.query('INSERT INTO blocks (name) VALUES (?)', [d.name]);
    await audit(req, 'INVENTORY_CREATE', 'block', r.insertId, d);
    res.status(201).json({ id: r.insertId, name: d.name, isActive: true });
  } catch (e) { next(e); }
});

// ---- rooms
router.post('/rooms', staff, async (req, res, next) => {
  try {
    const d = validate(req.body, { blockId: { type: 'int', required: true, min: 1 }, roomNumber: { required: true, max: 20 }, floor: { type: 'int', min: -2, max: 100 } });
    const [[b]] = await pool.query('SELECT id, is_active FROM blocks WHERE id = ?', [d.blockId]);
    if (!b) throw E.notFound('Block');
    if (!b.is_active) throw E.conflict('Block is deactivated', 'BLOCK_INACTIVE');
    const [r] = await pool.query('INSERT INTO rooms (block_id, room_number, floor) VALUES (?,?,?)', [d.blockId, d.roomNumber, d.floor ?? null]);
    await audit(req, 'INVENTORY_CREATE', 'room', r.insertId, d);
    res.status(201).json({ id: r.insertId, blockId: d.blockId, roomNumber: d.roomNumber, floor: d.floor ?? null, isActive: true });
  } catch (e) { next(e); }
});

// ---- beds
router.post('/beds', staff, async (req, res, next) => {
  try {
    const d = validate(req.body, { roomId: { type: 'int', required: true, min: 1 }, label: { required: true, max: 20 } });
    const [[r]] = await pool.query('SELECT id, is_active FROM rooms WHERE id = ?', [d.roomId]);
    if (!r) throw E.notFound('Room');
    if (!r.is_active) throw E.conflict('Room is deactivated', 'ROOM_INACTIVE');
    const [res2] = await pool.query('INSERT INTO beds (room_id, label) VALUES (?,?)', [d.roomId, d.label]);
    await audit(req, 'INVENTORY_CREATE', 'bed', res2.insertId, d);
    res.status(201).json({ id: res2.insertId, roomId: d.roomId, label: d.label, isActive: true });
  } catch (e) { next(e); }
});

/**
 * PATCH /blocks|rooms|beds/:id  { name|roomNumber|floor|label, isActive }
 * Deactivation cascades down the tree but is refused while any affected bed is currently allocated.
 */
const EDITABLE = {
  blocks: { table: 'blocks', rules: { name: { max: 60 }, isActive: { type: 'bool' } }, cols: { name: 'name' }, entity: 'block' },
  rooms: { table: 'rooms', rules: { roomNumber: { max: 20 }, floor: { type: 'int', min: -2, max: 100 }, isActive: { type: 'bool' } }, cols: { roomNumber: 'room_number', floor: 'floor' }, entity: 'room' },
  beds: { table: 'beds', rules: { label: { max: 20 }, isActive: { type: 'bool' } }, cols: { label: 'label' }, entity: 'bed' },
};

const OCCUPIED_SQL = {
  blocks: `SELECT COUNT(*) AS n FROM allocations a JOIN beds bd ON bd.id = a.bed_id JOIN rooms r ON r.id = bd.room_id WHERE r.block_id = ? AND a.released_at IS NULL`,
  rooms: `SELECT COUNT(*) AS n FROM allocations a JOIN beds bd ON bd.id = a.bed_id WHERE bd.room_id = ? AND a.released_at IS NULL`,
  beds: `SELECT COUNT(*) AS n FROM allocations a WHERE a.bed_id = ? AND a.released_at IS NULL`,
};

Object.entries(EDITABLE).forEach(([path, cfg]) => {
  router.patch(`/${path}/:id`, staff, async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      const d = validate(req.body, cfg.rules);
      if (!Object.keys(d).length) throw E.validation({ _: 'Nothing to update' });
      await withTransaction(async (conn) => {
        const [[row]] = await conn.query(`SELECT * FROM ${cfg.table} WHERE id = ? FOR UPDATE`, [id]);
        if (!row) throw E.notFound(cfg.entity);
        if (d.isActive === false) {
          const [[{ n }]] = await conn.query(OCCUPIED_SQL[path], [id]);
          if (n > 0) throw E.conflict(`Cannot deactivate ${cfg.entity}: ${n} bed(s) are currently allocated`, 'OCCUPIED');
        }
        if (d.isActive === true && path === 'rooms') {
          const [[b]] = await conn.query('SELECT is_active FROM blocks WHERE id = ?', [row.block_id]);
          if (!b.is_active) throw E.conflict('Reactivate the block first', 'BLOCK_INACTIVE');
        }
        if (d.isActive === true && path === 'beds') {
          const [[r]] = await conn.query('SELECT is_active FROM rooms WHERE id = ?', [row.room_id]);
          if (!r.is_active) throw E.conflict('Reactivate the room first', 'ROOM_INACTIVE');
        }
        const sets = []; const vals = [];
        for (const [k, col] of Object.entries(cfg.cols)) if (d[k] !== undefined) { sets.push(`${col} = ?`); vals.push(d[k]); }
        if (d.isActive !== undefined) { sets.push('is_active = ?'); vals.push(d.isActive ? 1 : 0); }
        await conn.query(`UPDATE ${cfg.table} SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
        if (d.isActive === false) {
          if (path === 'blocks') {
            await conn.query('UPDATE rooms SET is_active = 0 WHERE block_id = ?', [id]);
            await conn.query('UPDATE beds SET is_active = 0 WHERE room_id IN (SELECT id FROM rooms WHERE block_id = ?)', [id]);
          } else if (path === 'rooms') {
            await conn.query('UPDATE beds SET is_active = 0 WHERE room_id = ?', [id]);
          }
        }
      });
      await audit(req, d.isActive === false ? 'INVENTORY_DEACTIVATE' : 'INVENTORY_UPDATE', cfg.entity, id, d);
      res.json({ id, ...d });
    } catch (e) { next(e); }
  });
});

module.exports = router;
