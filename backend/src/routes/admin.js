const express = require('express');
const { pool } = require('../db');
const { E } = require('../utils/errors');
const { computeHash, GENESIS } = require('../utils/audit');

const router = express.Router();
const AUDIT_FIELDS = 'id, user_id, role, action, entity, entity_id, details, ip, created_at, prev_hash, hash';

function requireAdmin(req, _res, next) {
  if (!req.session?.user) return next(E.unauthenticated());
  if (req.session.user.role !== 'admin') return next(E.forbidden());
  return next();
}

function parsePageValue(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  if (value == null) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? Math.min(parsed, maximum) : null;
}

router.get('/audit/verify', requireAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${AUDIT_FIELDS} FROM audit_logs ORDER BY id ASC`
    );
    const [heads] = await pool.query('SELECT last_hash FROM audit_head WHERE id = 1');
    if (!heads.length) throw new Error('Audit chain head is missing');

    let expectedPrevHash = GENESIS;
    let invalidId = null;
    for (const row of rows) {
      const expectedHash = computeHash(expectedPrevHash, row);
      if (row.prev_hash !== expectedPrevHash || row.hash !== expectedHash) {
        invalidId = row.id;
        break;
      }
      expectedPrevHash = row.hash;
    }

    const valid = invalidId === null && heads[0].last_hash === expectedPrevHash;
    res.json({
      valid,
      checked: rows.length,
      ...(invalidId === null ? {} : { firstInvalidId: invalidId }),
      ...(valid || invalidId !== null ? {} : { headMismatch: true }),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/audit', requireAdmin, async (req, res, next) => {
  const page = parsePageValue(req.query.page, 1);
  const pageSize = parsePageValue(req.query.pageSize, 50, 100);
  if (page === null || pageSize === null) {
    return next(E.validation({ page: page === null ? 'Must be a positive integer' : undefined,
      pageSize: pageSize === null ? 'Must be a positive integer no greater than 100' : undefined }));
  }

  try {
    const offset = (page - 1) * pageSize;
    if (!Number.isSafeInteger(offset)) {
      return next(E.validation({ page: 'Page is too large' }));
    }
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM audit_logs');
    const [rows] = await pool.query(
      `SELECT ${AUDIT_FIELDS} FROM audit_logs ORDER BY id DESC LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );
    res.json({ items: rows, page, pageSize, total: Number(total) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
