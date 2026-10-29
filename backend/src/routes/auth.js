// M1 - HMS-F-001 (registration), HMS-F-002 (login/session)
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { pool, withTransaction } = require('../db');
const { E } = require('../utils/errors');
const { validate } = require('../utils/validate');
const { audit } = require('../utils/audit');
const { requireAuth } = require('../middleware/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.isTest ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ errorCode: 'RATE_LIMITED', message: 'Too many attempts, try again later', requestId: req.id }),
});

const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
const passwordRule = { type: 'string', required: true, pattern: PASSWORD_RE, label: 'Password',
  patternMessage: 'Password must be 8-72 characters and contain a letter and a digit' };

const sessionUser = (u) => ({ id: u.id, role: u.role, name: u.name, email: u.email });

// HMS-F-001 / AC-HMS-F001 / TC-Auth-01
router.post('/register', loginLimiter, async (req, res, next) => {
  try {
    const d = validate(req.body, {
      srn: { required: true, min: 5, max: 30, pattern: /^[A-Za-z0-9]+$/, label: 'SRN', patternMessage: 'SRN must be alphanumeric' },
      name: { required: true, max: 120, label: 'Name' },
      email: { type: 'email', required: true, label: 'Institutional email' },
      password: passwordRule,
      contact: { required: true, pattern: /^[0-9+\-\s]{7,20}$/, label: 'Contact number', patternMessage: 'Contact number is not valid' },
      department: { max: 80 },
      yearOfStudy: { type: 'int', min: 1, max: 8, label: 'Year of study' },
      guardianName: { max: 120 }, guardianContact: { pattern: /^[0-9+\-\s]{7,20}$/ }, address: { max: 300 },
    });
    if (config.emailDomain && !d.email.endsWith(`@${config.emailDomain}`)) {
      throw E.validation({ email: `Email must belong to @${config.emailDomain}` });
    }
    const hash = await bcrypt.hash(d.password, config.bcryptRounds);
    const userId = await withTransaction(async (conn) => {
      const [[dup]] = await conn.query('SELECT (SELECT COUNT(*) FROM users WHERE email = ?) AS e, (SELECT COUNT(*) FROM students WHERE srn = ?) AS s', [d.email, d.srn.toUpperCase()]);
      if (dup.e) throw E.conflict('Email is already registered', 'EMAIL_EXISTS');
      if (dup.s) throw E.conflict('SRN is already registered', 'SRN_EXISTS');
      const [u] = await conn.query('INSERT INTO users (email, password_hash, name, role) VALUES (?,?,?,?)', [d.email, hash, d.name, 'student']);
      await conn.query(
        `INSERT INTO students (user_id, srn, contact, department, year_of_study, guardian_name, guardian_contact, address)
         VALUES (?,?,?,?,?,?,?,?)`,
        [u.insertId, d.srn.toUpperCase(), d.contact, d.department || null, d.yearOfStudy || null, d.guardianName || null, d.guardianContact || null, d.address || null]
      );
      return u.insertId;
    });
    await audit(req, 'REGISTER', 'user', userId, { srn: d.srn.toUpperCase() }, { userId, role: 'student' });
    res.status(201).json({ userId, role: 'student' });
  } catch (err) { next(err); }
});

// HMS-F-002 / AC-HMS-F002 / TC-Auth-02
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const d = validate(req.body, { email: { type: 'email', required: true }, password: { type: 'string', required: true, max: 200 } });
    const [[user]] = await pool.query('SELECT id, email, name, role, password_hash, is_active FROM users WHERE email = ?', [d.email]);
    // Constant-ish work whether or not the user exists (no user enumeration).
    const ok = await bcrypt.compare(d.password, user ? user.password_hash : '$2a$04$invalidinvalidinvalidinvaliduHXQ6o0q9Zr8m6kYk8mJk4o1zN8e2');
    if (!user || !ok || !user.is_active) {
      await audit(req, 'LOGIN_FAILED', 'user', user?.id ?? null, { email: d.email }, { userId: user?.id ?? null, role: user?.role ?? null });
      throw E.invalidCredentials();
    }
    await new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
    req.session.user = sessionUser(user);
    await audit(req, 'LOGIN', 'user', user.id, null);
    res.json({ userId: user.id, role: user.role, sessionStatus: 'active', name: user.name });
  } catch (err) { next(err); }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await audit(req, 'LOGOUT', 'user', req.session.user.id, null);
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('hms.sid');
      return res.json({ sessionStatus: 'ended' });
    });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, (req, res) => res.json(req.session.user));

module.exports = router;
