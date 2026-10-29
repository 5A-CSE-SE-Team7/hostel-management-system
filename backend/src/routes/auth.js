const router = require('express').Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { pool, withTransaction } = require('../db');
const { E } = require('../utils/errors');
const { validate } = require('../utils/validate');
const { audit } = require('../utils/audit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.isTest ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    errorCode: 'RATE_LIMITED',
    message: 'Too many attempts, try again later',
    requestId: req.id,
  }),
});

const passwordRule = {
  type: 'string',
  required: true,
  max: 72,
  pattern: /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/,
  label: 'Password',
  patternMessage: 'Password must be 8-72 characters and contain a letter and a digit',
};

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const data = validate(req.body, {
      srn: { required: true, min: 5, max: 30, pattern: /^[A-Za-z0-9]+$/, label: 'SRN', patternMessage: 'SRN must be alphanumeric' },
      name: { required: true, max: 120, label: 'Name' },
      email: { type: 'email', required: true, label: 'Institutional email' },
      password: passwordRule,
      contact: { required: true, pattern: /^[0-9+\-\s]{7,20}$/, label: 'Contact number', patternMessage: 'Contact number is not valid' },
    });

    if (config.emailDomain && !data.email.endsWith(`@${config.emailDomain}`)) {
      throw E.validation({ email: `Email must belong to @${config.emailDomain}` });
    }

    const srn = data.srn.toUpperCase();
    const passwordHash = await bcrypt.hash(data.password, config.bcryptRounds);
    let userId;
    try {
      userId = await withTransaction(async (conn) => {
        const [[duplicate]] = await conn.query(
          'SELECT (SELECT COUNT(*) FROM users WHERE email = ?) AS email_count, (SELECT COUNT(*) FROM students WHERE srn = ?) AS srn_count',
          [data.email, srn],
        );
        if (duplicate.email_count) throw E.conflict('Email is already registered', 'EMAIL_EXISTS', { email: 'This email is already registered' });
        if (duplicate.srn_count) throw E.conflict('SRN is already registered', 'SRN_EXISTS', { srn: 'This SRN is already registered' });

        const [user] = await conn.query(
          'INSERT INTO users (email, password_hash, name, role) VALUES (?,?,?,?)',
          [data.email, passwordHash, data.name, 'student'],
        );
        await conn.query(
          'INSERT INTO students (user_id, srn, contact) VALUES (?,?,?)',
          [user.insertId, srn, data.contact],
        );
        return user.insertId;
      });
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
      const [[existing]] = await pool.query(
        'SELECT (SELECT COUNT(*) FROM users WHERE email = ?) AS email_count, (SELECT COUNT(*) FROM students WHERE srn = ?) AS srn_count',
        [data.email, srn],
      );
      if (existing.email_count) throw E.conflict('Email is already registered', 'EMAIL_EXISTS', { email: 'This email is already registered' });
      if (existing.srn_count) throw E.conflict('SRN is already registered', 'SRN_EXISTS', { srn: 'This SRN is already registered' });
      throw err;
    }

    await audit(req, 'REGISTER', 'user', userId, { srn }, { userId, role: 'student' });
    return res.status(201).json({ userId, role: 'student' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
