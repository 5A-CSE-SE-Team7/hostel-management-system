const router = require('express').Router();
const { pool } = require('../db');
const { E } = require('../utils/errors');
const { requireAuth } = require('../middleware/auth');
function id(value) {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value) || Number(value) > 4294967295) throw E.validation({ id: 'Invalid notification identifier' });
  return Number(value);
}
router.use(requireAuth);
router.get('/notifications', async (req, res, next) => {
  try {
    const before = req.query.before === undefined ? null : id(req.query.before);
    const [rows] = await pool.query(`SELECT id, type, message, ref_type AS refType, ref_id AS refId, is_read AS isRead, delivery_status AS deliveryStatus, created_at AS createdAt FROM notifications WHERE user_id = ? ${before ? 'AND id < ?' : ''} ORDER BY id DESC LIMIT 100`, before ? [req.session.user.id, before] : [req.session.user.id]);
    res.json(rows.map(row => ({ ...row, isRead: !!row.isRead })));
  } catch (error) { next(error); }
});
router.get('/notifications/unread-count', async (req, res, next) => {
  try {
    const [[row]] = await pool.query('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0', [req.session.user.id]);
    res.json(row);
  } catch (error) { next(error); }
});
router.post('/notifications/read-all', async (req, res, next) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.session.user.id]); res.json({ ok: true });
  } catch (error) { next(error); }
});
router.post('/notifications/:id/read', async (req, res, next) => {
  try {
    const notificationId = id(req.params.id);
    const [[record]] = await pool.query('SELECT id FROM notifications WHERE id = ? AND user_id = ?', [notificationId, req.session.user.id]);
    if (!record) throw E.notFound('Notification');
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notificationId, req.session.user.id]);
    res.json({ ok: true });
  } catch (error) { next(error); }
});
module.exports = router;
