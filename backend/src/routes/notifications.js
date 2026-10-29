const router = require('express').Router();
const { pool } = require('../db');
const { parseId } = require('../utils/validate');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/notifications', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, type, message, ref_type AS refType, ref_id AS refId, is_read AS isRead, delivery_status AS deliveryStatus, created_at AS createdAt
       FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 100`, [req.session.user.id]);
    res.json(rows.map((r) => ({ ...r, isRead: !!r.isRead })));
  } catch (e) { next(e); }
});

router.get('/notifications/unread-count', async (req, res, next) => {
  try {
    const [[r]] = await pool.query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', [req.session.user.id]);
    res.json({ count: r.n });
  } catch (e) { next(e); }
});

router.post('/notifications/read-all', async (req, res, next) => {
  try { await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.session.user.id]); res.json({ ok: true }); } catch (e) { next(e); }
});

router.post('/notifications/:id/read', async (req, res, next) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [parseId(req.params.id), req.session.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
