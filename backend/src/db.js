const mysql = require('mysql2/promise');
const config = require('./config');

const connectionLimit = Number(process.env.DB_CONNECTION_LIMIT || 100);
if (!Number.isSafeInteger(connectionLimit) || connectionLimit < 1 || connectionLimit > 500) {
  throw new Error('DB_CONNECTION_LIMIT must be an integer between 1 and 500');
}

// dateStrings keeps DATE/DATETIME as plain strings (stable audit hashing, no TZ surprises).
// The same pool serves application queries and MySQL-backed sessions.
const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit,
  queueLimit: 0,
  dateStrings: true,
  timezone: 'Z',
  decimalNumbers: true,
});

/** Run fn(conn) inside a transaction; commits on success, rolls back on any error. */
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try { await conn.rollback(); } catch (_) { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, withTransaction };
