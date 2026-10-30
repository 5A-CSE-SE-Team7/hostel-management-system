const crypto = require('crypto');
const { pool } = require('../db');

// Keep the established M1/M2 canonical hash format for existing audit rows.
// PR53's event-object call is an adapter into the same transaction/chain.

const GENESIS = '0'.repeat(64);

function computeHash(previous, row) {
  const payload = JSON.stringify([
    previous,
    row.user_id ?? null,
    row.role ?? null,
    row.action,
    row.entity ?? null,
    row.entity_id ?? null,
    row.details ?? null,
    row.ip ?? null,
    row.created_at,
  ]);
  return crypto.createHash('sha256').update(payload).digest('hex');
}

async function audit(req, action, entity, entityId, details, options = {}) {
  const eventCall = req && Object.hasOwn(req, 'action') && typeof action !== 'string';
  let event;
  if (eventCall) {
    event = req;
    if (typeof event.action !== 'string' || !event.action.trim()) throw new TypeError('Audit event action is required');
    options = { conn: action, strict: true };
    action = event.action.trim(); entity = event.entity; entityId = event.entity_id;
    details = event.details;
    req = null;
  }
  const conn = options.conn || await pool.getConnection();
  const ownConnection = !options.conn;
  try {
    if (ownConnection) await conn.beginTransaction();
    const [[head]] = await conn.query('SELECT last_hash FROM audit_head WHERE id = 1 FOR UPDATE');
    if (!head) throw new Error('Audit chain head is missing');
    const row = {
      user_id: event?.user_id ?? options.userId ?? req?.session?.user?.id ?? null,
      role: event?.role ?? options.role ?? req?.session?.user?.role ?? null,
      action,
      entity: entity ?? null,
      entity_id: entityId == null ? null : String(entityId),
      details: details == null ? null : typeof details === 'string' ? details : JSON.stringify(details),
      ip: event?.ip ?? req?.ip ?? null,
      created_at: new Date(event?.created_at ?? Date.now()).toISOString().slice(0, 23).replace('T', ' '),
    };
    const hash = computeHash(head.last_hash, row);
    const [insert] = await conn.query(
      `INSERT INTO audit_logs (user_id, role, action, entity, entity_id, details, ip, created_at, prev_hash, hash)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [row.user_id, row.role, row.action, row.entity, row.entity_id, row.details, row.ip, row.created_at, head.last_hash, hash],
    );
    await conn.query('UPDATE audit_head SET last_hash = ? WHERE id = 1', [hash]);
    if (ownConnection) await conn.commit();
    return { id: insert.insertId, hash, prev_hash: head.last_hash, ...row };
  } catch (err) {
    if (ownConnection) {
      try { await conn.rollback(); } catch (_) { /* ignore rollback errors */ }
    }
    console.error('[audit] failed to write audit event', action, err.message);
    if (options.strict) throw err;
  } finally {
    if (ownConnection) conn.release();
  }
}

async function verifyChain() {
  const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY id ASC');
  let previous = GENESIS;
  for (const row of rows) {
    if (row.prev_hash !== previous || computeHash(previous, row) !== row.hash) {
      return { valid: false, checked: rows.length, brokenAtId: row.id, firstInvalidId: row.id };
    }
    previous = row.hash;
  }
  const [[head]] = await pool.query('SELECT last_hash FROM audit_head WHERE id = 1');
  if (!head) throw new Error('Audit chain head is missing');
  if (head.last_hash !== previous) {
    return { valid: false, checked: rows.length, brokenAtId: null, headMismatch: true, reason: 'chain head mismatch' };
  }
  return { valid: true, checked: rows.length };
}

module.exports = { audit, verifyChain, computeHash, GENESIS };
