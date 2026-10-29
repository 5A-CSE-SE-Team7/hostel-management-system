const crypto = require('crypto');
const { pool } = require('../db');

const GENESIS = '0'.repeat(64);

const nowStamp = () => new Date().toISOString().slice(0, 23).replace('T', ' '); // YYYY-MM-DD HH:MM:SS.mmm UTC

function computeHash(prev, row) {
  const payload = JSON.stringify([prev, row.user_id ?? null, row.role ?? null, row.action, row.entity ?? null,
    row.entity_id ?? null, row.details ?? null, row.ip ?? null, row.created_at]);
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Append a tamper-evident audit event (HMS-SR-004/005).
 * The audit_head row is locked so concurrent writers form one linear hash chain.
 * Audit failures must never break the business action, so errors are logged and swallowed
 * unless opts.strict is set.
 */
async function audit(req, action, entity, entityId, details, opts = {}) {
  const conn = opts.conn || (await pool.getConnection());
  const ownConn = !opts.conn;
  try {
    if (ownConn) await conn.beginTransaction();
    const [[head]] = await conn.query('SELECT last_hash FROM audit_head WHERE id = 1 FOR UPDATE');
    const row = {
      user_id: opts.userId ?? req?.session?.user?.id ?? null,
      role: opts.role ?? req?.session?.user?.role ?? null,
      action,
      entity: entity ?? null,
      entity_id: entityId != null ? String(entityId) : null,
      details: details ? JSON.stringify(details) : null,
      ip: req?.ip ?? null,
      created_at: nowStamp(),
    };
    const hash = computeHash(head.last_hash, row);
    await conn.query(
      `INSERT INTO audit_logs (user_id, role, action, entity, entity_id, details, ip, created_at, prev_hash, hash)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [row.user_id, row.role, row.action, row.entity, row.entity_id, row.details, row.ip, row.created_at, head.last_hash, hash]
    );
    await conn.query('UPDATE audit_head SET last_hash = ? WHERE id = 1', [hash]);
    if (ownConn) await conn.commit();
  } catch (err) {
    if (ownConn) { try { await conn.rollback(); } catch (_) { /* ignore */ } }
    console.error('[audit] failed to write audit event', action, err.message);
    if (opts.strict) throw err;
  } finally {
    if (ownConn) conn.release();
  }
}

/** Re-computes the whole chain and reports the first inconsistency, if any. */
async function verifyChain() {
  const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY id ASC');
  let prev = GENESIS;
  for (const r of rows) {
    if (r.prev_hash !== prev || computeHash(prev, r) !== r.hash) {
      return { valid: false, checked: rows.length, brokenAtId: r.id };
    }
    prev = r.hash;
  }
  const [[head]] = await pool.query('SELECT last_hash FROM audit_head WHERE id = 1');
  if (head.last_hash !== prev) return { valid: false, checked: rows.length, brokenAtId: null, reason: 'chain head mismatch (rows removed from the end?)' };
  return { valid: true, checked: rows.length };
}

module.exports = { audit, verifyChain, computeHash, GENESIS };
