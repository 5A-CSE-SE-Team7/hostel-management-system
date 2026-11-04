// Sprint 1 leave decision delivery: authenticated recipients can read only their inbox.
const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
router.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, type, message, created_at AS createdAt FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 100', [req.session.user.id]);
    res.json(rows);
  } catch (error) { next(error); }
});
module.exports = router;
