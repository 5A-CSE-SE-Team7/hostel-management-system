const crypto = require('crypto');
const { withTransaction } = require('../db');

// The all-zero hash anchors the first event in the chain.
const GENESIS = '0'.repeat(64);
const HASHED_FIELDS = [
  'user_id', 'role', 'action', 'entity', 'entity_id', 'details', 'ip', 'created_at',
];

/** Hash the previous link and the audit row's fields in a fixed order. */
function computeHash(prevHash, row) {
  const canonicalRow = {};
  for (const field of HASHED_FIELDS) canonicalRow[field] = row[field] ?? null;
  return crypto.createHash('sha256')
    .update(JSON.stringify({ prev_hash: prevHash, ...canonicalRow }), 'utf8')
    .digest('hex');
}

function serializeDetails(details) {
  if (details == null) return null;
  return typeof details === 'string' ? details : JSON.stringify(details);
}

/**
 * Append one audit event. Pass the caller's transaction connection when the
 * event must commit atomically with a business change; otherwise this helper
 * opens and commits its own transaction.
 */
async function audit(event, connection) {
  if (!event || typeof event.action !== 'string' || !event.action.trim()) {
    throw new TypeError('Audit event action is required');
  }

  const append = async (conn) => {
    const [heads] = await conn.query(
      'SELECT last_hash FROM audit_head WHERE id = 1 FOR UPDATE'
    );
    if (!heads.length) throw new Error('Audit chain head is missing');

    const row = {
      user_id: event.user_id ?? null,
      role: event.role ?? null,
      action: event.action.trim(),
      entity: event.entity ?? null,
      entity_id: event.entity_id == null ? null : String(event.entity_id),
      details: serializeDetails(event.details),
      ip: event.ip ?? null,
      created_at: event.created_at ?? new Date().toISOString(),
    };
    const prevHash = heads[0].last_hash || GENESIS;
    const hash = computeHash(prevHash, row);

    const [insert] = await conn.query(
      `INSERT INTO audit_logs
        (user_id, role, action, entity, entity_id, details, ip, created_at, prev_hash, hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...HASHED_FIELDS.map((field) => row[field]), prevHash, hash]
    );
    await conn.query('UPDATE audit_head SET last_hash = ? WHERE id = 1', [hash]);
    return { id: insert.insertId, hash, prev_hash: prevHash, ...row };
  };

  return connection ? append(connection) : withTransaction(append);
}

module.exports = { audit, computeHash, GENESIS };
