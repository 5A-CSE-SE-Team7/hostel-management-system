const config = require('../config');
const { pool } = require('../db');

let transporter = null;
function getTransporter() {
  if (!config.smtp?.host) return null;
  if (!transporter) {
    try {
      // eslint-disable-next-line global-require
      const nodemailer = require('nodemailer');
      transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
      });
    } catch (e) {
      console.warn('[notify] nodemailer not available, skipping email delivery:', e.message);
      return null;
    }
  }
  return transporter;
}

/**
 * Notification adapter (HMS-F-012). The originating status change is already persisted by the
 * caller; here we persist the in-app notification first, then try e-mail as a best-effort
 * secondary channel with retry. Delivery failures never fail the business action (SAD 3.7).
 */
async function notify(userId, type, message, ref = {}) {
  let id = null;
  try {
    const [res] = await pool.query(
      'INSERT INTO notifications (user_id, type, message, ref_type, ref_id) VALUES (?,?,?,?,?)',
      [userId, type, (message || '').slice(0, 300), ref?.type || null, ref?.id || null]
    );
    id = res.insertId;
  } catch (err) {
    console.error('[notify] could not persist notification:', err.message);
    return null;
  }

  const t = getTransporter();
  if (t) {
    setImmediate(async () => {
      try {
        const [[u]] = await pool.query('SELECT email FROM users WHERE id = ?', [userId]);
        if (!u?.email) return;
        let sent = false;
        for (let attempt = 1; attempt <= 3 && !sent; attempt += 1) {
          try {
            await t.sendMail({
              from: config.smtp.from,
              to: u.email,
              subject: `HMS: ${type.replace(/_/g, ' ')}`,
              text: message,
            });
            sent = true;
          } catch (err) {
            console.error(`[notify] email attempt ${attempt} failed:`, err.message);
          }
        }
        await pool.query('UPDATE notifications SET delivery_status = ? WHERE id = ?', [sent ? 'sent' : 'failed', id]);
      } catch (err) {
        console.error('[notify] email pipeline error:', err.message);
      }
    });
  }
  return id;
}

module.exports = { notify };

