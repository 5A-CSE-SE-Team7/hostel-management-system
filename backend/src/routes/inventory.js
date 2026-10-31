const express = require('express');
const { pool, withTransaction } = require('../db');
const { E } = require('../utils/errors');
const { validate, parseId } = require('../utils/validate');

const router = express.Router();

function requireInventoryRole(req, _res, next) {
  if (!req.session?.user) return next(E.unauthenticated());
  if (!['admin', 'warden'].includes(req.session.user.role)) return next(E.forbidden());
  return next();
}

function parseIsActive(body) {
  if (!Object.hasOwn(body, 'isActive')) return undefined;
  const value = body.isActive;
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  throw E.validation({ isActive: 'isActive must be true or false' });
}

function requireFields(data, fields) {
  if (!fields.some((field) => Object.hasOwn(data, field))) {
    throw E.validation({ body: 'At least one editable field is required' });
  }
}

async function requireActiveParent(conn, table, id, what) {
  const [rows] = await conn.query(`SELECT id, is_active FROM ${table} WHERE id = ? FOR UPDATE`, [id]);
  if (!rows.length) throw E.notFound(what);
  if (!rows[0].is_active) throw E.conflict(`${what} is inactive`, 'INACTIVE_PARENT');
}

async function assertBedsUnoccupied(conn, bedIds) {
  if (!bedIds.length) return;
  const placeholders = bedIds.map(() => '?').join(',');
  const [occupied] = await conn.query(
    `SELECT bed_id FROM allocations WHERE released_at IS NULL AND bed_id IN (${placeholders}) LIMIT 1`,
    bedIds
  );
  if (occupied.length) throw E.conflict('Occupied beds cannot be deactivated', 'OCCUPIED');
}

async function deactivateBeds(conn, bedIds) {
  if (!bedIds.length) return;
  await assertBedsUnoccupied(conn, bedIds);
  const placeholders = bedIds.map(() => '?').join(',');
  await conn.query(`UPDATE beds SET is_active = 0 WHERE id IN (${placeholders})`, bedIds);
}

async function deactivateRoom(conn, roomId) {
  const [rooms] = await conn.query('SELECT id FROM rooms WHERE id = ? FOR UPDATE', [roomId]);
  if (!rooms.length) throw E.notFound('Room');
  const [beds] = await conn.query('SELECT id FROM beds WHERE room_id = ? FOR UPDATE', [roomId]);
  await deactivateBeds(conn, beds.map((bed) => bed.id));
  await conn.query('UPDATE rooms SET is_active = 0 WHERE id = ?', [roomId]);
}

async function deactivateBlock(conn, blockId) {
  const [blocks] = await conn.query('SELECT id FROM blocks WHERE id = ? FOR UPDATE', [blockId]);
  if (!blocks.length) throw E.notFound('Block');
  const [rooms] = await conn.query('SELECT id FROM rooms WHERE block_id = ? FOR UPDATE', [blockId]);
  const roomIds = rooms.map((room) => room.id);
  let bedIds = [];
  if (roomIds.length) {
    const placeholders = roomIds.map(() => '?').join(',');
    const [beds] = await conn.query(`SELECT id FROM beds WHERE room_id IN (${placeholders}) FOR UPDATE`, roomIds);
    bedIds = beds.map((bed) => bed.id);
  }
  await deactivateBeds(conn, bedIds);
  if (roomIds.length) {
    const placeholders = roomIds.map(() => '?').join(',');
    await conn.query(`UPDATE rooms SET is_active = 0 WHERE id IN (${placeholders})`, roomIds);
  }
  await conn.query('UPDATE blocks SET is_active = 0 WHERE id = ?', [blockId]);
}

function run(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.use(requireInventoryRole);

router.get('/inventory', run(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT b.id AS block_id, b.name AS block_name, b.is_active AS block_active,
           r.id AS room_id, r.room_number, r.floor, r.is_active AS room_active,
           d.id AS bed_id, d.label AS bed_label, d.is_active AS bed_active,
           a.id AS allocation_id
      FROM blocks b
      LEFT JOIN rooms r ON r.block_id = b.id
      LEFT JOIN beds d ON d.room_id = r.id
      LEFT JOIN allocations a ON a.bed_id = d.id AND a.released_at IS NULL
     ORDER BY b.name, r.room_number, d.label`);

  const blocks = new Map();
  for (const row of rows) {
    if (!blocks.has(row.block_id)) {
      blocks.set(row.block_id, {
        id: row.block_id, name: row.block_name, isActive: Boolean(row.block_active), rooms: [],
        _rooms: new Map(),
      });
    }
    const block = blocks.get(row.block_id);
    if (row.room_id == null) continue;
    if (!block._rooms.has(row.room_id)) {
      const room = {
        id: row.room_id, roomNumber: row.room_number, floor: row.floor,
        isActive: Boolean(row.room_active), beds: [],
      };
      block._rooms.set(row.room_id, room);
      block.rooms.push(room);
    }
    if (row.bed_id != null) {
      block._rooms.get(row.room_id).beds.push({
        id: row.bed_id, label: row.bed_label, isActive: Boolean(row.bed_active),
        occupied: row.allocation_id != null,
      });
    }
  }
  res.json([...blocks.values()].map(({ _rooms, ...block }) => block));
}));

router.post('/blocks', run(async (req, res) => {
  const { name } = validate(req.body, { name: { required: true, max: 60 } });
  const [result] = await pool.query('INSERT INTO blocks (name) VALUES (?)', [name]);
  res.status(201).json({ id: result.insertId, name, isActive: true });
}));

router.patch('/blocks/:id', run(async (req, res) => {
  const id = parseId(req.params.id, 'blockId');
  const data = validate(req.body, { name: { max: 60 } });
  const isActive = parseIsActive(req.body || {});
  requireFields({ ...data, ...(isActive === undefined ? {} : { isActive }) }, ['name', 'isActive']);

  if (isActive === false) {
    await withTransaction((conn) => deactivateBlock(conn, id));
  } else {
    const sets = [];
    const values = [];
    if (Object.hasOwn(data, 'name')) { sets.push('name = ?'); values.push(data.name); }
    if (isActive === true) { sets.push('is_active = 1'); }
    if (sets.length) {
      values.push(id);
      const [result] = await pool.query(`UPDATE blocks SET ${sets.join(', ')} WHERE id = ?`, values);
      if (!result.affectedRows) throw E.notFound('Block');
    }
  }
  const [[block]] = await pool.query('SELECT id, name, is_active FROM blocks WHERE id = ?', [id]);
  res.json({ id: block.id, name: block.name, isActive: Boolean(block.is_active) });
}));

router.post('/rooms', run(async (req, res) => {
  const data = validate(req.body, {
    blockId: { required: true, type: 'int', min: 1 },
    roomNumber: { required: true, max: 20 },
    floor: { type: 'int' },
  });
  const result = await withTransaction(async (conn) => {
    await requireActiveParent(conn, 'blocks', data.blockId, 'Block');
    const [insert] = await conn.query(
      'INSERT INTO rooms (block_id, room_number, floor) VALUES (?,?,?)',
      [data.blockId, data.roomNumber, data.floor ?? null]
    );
    return insert.insertId;
  });
  res.status(201).json({ id: result, ...data, isActive: true });
}));

router.patch('/rooms/:id', run(async (req, res) => {
  const id = parseId(req.params.id, 'roomId');
  const data = validate(req.body, {
    blockId: { type: 'int', min: 1 }, roomNumber: { max: 20 }, floor: { type: 'int' },
  });
  const isActive = parseIsActive(req.body || {});
  requireFields({ ...data, ...(isActive === undefined ? {} : { isActive }) }, ['blockId', 'roomNumber', 'floor', 'isActive']);

  await withTransaction(async (conn) => {
    const [rooms] = await conn.query('SELECT id, block_id FROM rooms WHERE id = ? FOR UPDATE', [id]);
    if (!rooms.length) throw E.notFound('Room');
    const room = rooms[0];
    if (data.blockId !== undefined) await requireActiveParent(conn, 'blocks', data.blockId, 'Block');
    if (isActive === false) return deactivateRoom(conn, id);
    if (isActive === true) await requireActiveParent(conn, 'blocks', data.blockId ?? room.block_id, 'Block');
    if (data.blockId !== undefined && data.blockId !== room.block_id) {
      const [beds] = await conn.query('SELECT id FROM beds WHERE room_id = ?', [id]);
      await assertBedsUnoccupied(conn, beds.map((bed) => bed.id));
    }

    const sets = [];
    const values = [];
    if (data.blockId !== undefined) { sets.push('block_id = ?'); values.push(data.blockId); }
    if (data.roomNumber !== undefined) { sets.push('room_number = ?'); values.push(data.roomNumber); }
    if (data.floor !== undefined) { sets.push('floor = ?'); values.push(data.floor); }
    if (isActive === true) sets.push('is_active = 1');
    if (sets.length) { values.push(id); await conn.query(`UPDATE rooms SET ${sets.join(', ')} WHERE id = ?`, values); }
  });
  const [[room]] = await pool.query('SELECT id, block_id, room_number, floor, is_active FROM rooms WHERE id = ?', [id]);
  res.json({ id: room.id, blockId: room.block_id, roomNumber: room.room_number, floor: room.floor, isActive: Boolean(room.is_active) });
}));

router.post('/beds', run(async (req, res) => {
  const data = validate(req.body, {
    roomId: { required: true, type: 'int', min: 1 }, label: { required: true, max: 20 },
  });
  const id = await withTransaction(async (conn) => {
    const [rooms] = await conn.query('SELECT id, block_id, is_active FROM rooms WHERE id = ? FOR UPDATE', [data.roomId]);
    if (!rooms.length) throw E.notFound('Room');
    if (!rooms[0].is_active) throw E.conflict('Room is inactive', 'INACTIVE_PARENT');
    await requireActiveParent(conn, 'blocks', rooms[0].block_id, 'Block');
    const [insert] = await conn.query('INSERT INTO beds (room_id, label) VALUES (?,?)', [data.roomId, data.label]);
    return insert.insertId;
  });
  res.status(201).json({ id, ...data, isActive: true, occupied: false });
}));

router.patch('/beds/:id', run(async (req, res) => {
  const id = parseId(req.params.id, 'bedId');
  const data = validate(req.body, { roomId: { type: 'int', min: 1 }, label: { max: 20 } });
  const isActive = parseIsActive(req.body || {});
  requireFields({ ...data, ...(isActive === undefined ? {} : { isActive }) }, ['roomId', 'label', 'isActive']);

  await withTransaction(async (conn) => {
    const [beds] = await conn.query('SELECT id, room_id FROM beds WHERE id = ? FOR UPDATE', [id]);
    if (!beds.length) throw E.notFound('Bed');
    const bed = beds[0];
    const targetRoomId = data.roomId ?? bed.room_id;
    const [rooms] = await conn.query('SELECT id, block_id, is_active FROM rooms WHERE id = ? FOR UPDATE', [targetRoomId]);
    if (!rooms.length) throw E.notFound('Room');
    if (isActive === true || data.roomId !== undefined) {
      if (!rooms[0].is_active) throw E.conflict('Room is inactive', 'INACTIVE_PARENT');
      await requireActiveParent(conn, 'blocks', rooms[0].block_id, 'Block');
    }
    if (isActive === false || targetRoomId !== bed.room_id) await assertBedsUnoccupied(conn, [id]);
    if (isActive === false) {
      await conn.query('UPDATE beds SET is_active = 0 WHERE id = ?', [id]);
      return;
    }
    const sets = [];
    const values = [];
    if (data.roomId !== undefined) { sets.push('room_id = ?'); values.push(data.roomId); }
    if (data.label !== undefined) { sets.push('label = ?'); values.push(data.label); }
    if (isActive === true) sets.push('is_active = 1');
    if (sets.length) { values.push(id); await conn.query(`UPDATE beds SET ${sets.join(', ')} WHERE id = ?`, values); }
  });
  const [[bed]] = await pool.query(
    `SELECT d.id, d.room_id, d.label, d.is_active,
            EXISTS(SELECT 1 FROM allocations a WHERE a.bed_id = d.id AND a.released_at IS NULL) AS occupied
       FROM beds d WHERE d.id = ?`, [id]
  );
  res.json({ id: bed.id, roomId: bed.room_id, label: bed.label, isActive: Boolean(bed.is_active), occupied: Boolean(bed.occupied) });
}));

module.exports = router;
