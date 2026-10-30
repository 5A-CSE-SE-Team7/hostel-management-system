// HMS-F-012 notification adapter. In-app state is durable; email is optional.
const config = require('../config');
const { pool } = require('../db');
let transport;
function configuredTransport() {
  if (!config.smtp.host) return null;
  if (!transport) transport = require('nodemailer').createTransport({
    host: config.smtp.host, port: config.smtp.port, secure: config.smtp.port === 465,
    requireTLS: config.smtp.port !== 465, tls: { minVersion: 'TLSv1.2' },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    disableFileAccess: true, disableUrlAccess: true,
  });
  return transport;
}
async function persist(conn, userId, type, message, ref) {
  const [result] = await conn.query('INSERT INTO notifications (user_id, type, message, ref_type, ref_id) VALUES (?,?,?,?,?)', [userId, type, message, 'complaint', ref]);
  return result.insertId;
}
// Factory is a test seam for optional SMTP, not a substitute for real auth/audit.
function createDelivery({ database = pool, getTransport = configuredTransport, log = console.error } = {}) {
  return async function deliver(id) {
    const sender = getTransport();
    if (!sender) return 'in_app';
    const connection = await database.getConnection();
    const lock = `hms-notification-${id}`;
    let acquired = false;
    try {
      const [[result]] = await connection.query('SELECT GET_LOCK(?, 0) AS acquired', [lock]);
      acquired = result.acquired === 1;
      if (!acquired) return 'busy';
    const [[notification]] = await connection.query('SELECT n.id, n.type, n.message, n.delivery_status AS deliveryStatus, u.email FROM notifications n JOIN users u ON u.id = n.user_id WHERE n.id = ?', [id]);
    if (!notification || notification.deliveryStatus === 'sent') return notification?.deliveryStatus || 'missing';
    let status = 'failed';
    // Initial attempt plus three retries. Never include SMTP error strings or
    // addresses in logs: server errors can contain credentials/recipient data.
    for (let attempt = 0; attempt <= 3; attempt += 1) {
      try {
        await sender.sendMail({ from: config.smtp.from, to: notification.email, subject: `HMS: ${notification.type.replaceAll('_', ' ')}`, text: notification.message, disableFileAccess: true, disableUrlAccess: true });
        status = 'sent'; break;
      } catch (_) { log(`[notify] notification ${id}: email attempt ${attempt + 1} failed`); }
    }
    await connection.query('UPDATE notifications SET delivery_status = ? WHERE id = ?', [status, id]);
    return status;
    } finally {
      try { if (acquired) await connection.query('SELECT RELEASE_LOCK(?)', [lock]); } finally { connection.release(); }
    }
  };
}
const deliver = createDelivery();
function queueDelivery(ids) {
  if (!config.smtp.host) return;
  setImmediate(() => {
    Promise.all(ids.map(id => deliver(id))).catch(() => console.error('[notify] optional email pipeline failed; use the retry worker'));
  });
}
// Compatibility adapter for existing M4 callers; do not implement fee rules here.
async function notify(userId, type, message, ref = {}) {
  try {
    const [result] = await pool.query('INSERT INTO notifications (user_id, type, message, ref_type, ref_id) VALUES (?,?,?,?,?)', [userId, type, String(message).slice(0, 300), ref.type || null, ref.id || null]);
    queueDelivery([result.insertId]);
    return result.insertId;
  } catch (_) { console.error('[notify] could not persist optional notification'); return null; }
}
module.exports = { persist, notify, createDelivery, deliver, queueDelivery };
