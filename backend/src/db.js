const mysql = require('mysql2/promise');
const config = require('./config');

// dateStrings keeps DATE/DATETIME as plain strings (stable audit hashing, no TZ surprises).
const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 20,
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
