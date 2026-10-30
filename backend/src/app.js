const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const config = require('./config');
const { pool } = require('./db');
const common = require('./middleware/common');

function createApp() {
  const app = express();
  app.set('trust proxy', 1); // behind nginx / cloud LB that terminates TLS
  app.disable('x-powered-by');

  app.use(common.requestId);
  app.use(common.accessLog);
  app.use(helmet({ hsts: config.isProd ? { maxAge: 31536000, includeSubDomains: true } : false }));
  app.use(common.enforceHttps);
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(common.requireJsonBody);

  const store = new MySQLStore({ createDatabaseTable: false, clearExpired: true, checkExpirationInterval: 15 * 60 * 1000, expiration: 8 * 60 * 60 * 1000 }, pool);
  app.use(session({
    name: 'hms.sid',
    secret: config.sessionSecret,
    store,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: config.isProd || config.requireHttps, maxAge: 8 * 60 * 60 * 1000 },
  }));
  app.locals.sessionStore = store;

  // Health check for availability monitoring (HMS-NF-003)
  app.get('/api/health', async (_req, res) => {
    try { await pool.query('SELECT 1'); res.json({ status: 'ok', uptimeSec: Math.round(process.uptime()) }); }
    catch (e) { res.status(503).json({ status: 'degraded' }); }
  });

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api', require('./routes/profile'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api', require('./routes/inventory'));
  app.use('/api', require('./routes/allocations'));
  app.use('/api', require('./routes/complaints')); // HMS-F-009; requires real M1/M2 modules
  // mounted by M3 PR: app.use('/api', require('./routes/notifications'));
  // mounted by M4 PR: app.use('/api', require('./routes/fees'));
  // mounted by M4 PR: app.use('/api', require('./routes/visitors'));
  // mounted by M4 PR: app.use('/api', require('./routes/leave'));
  // mounted by M4 PR: app.use('/api/reports', require('./routes/reports'));

  app.use(common.notFound);
  app.use(common.errorHandler);
  return app;
}

module.exports = { createApp };
