require('dotenv').config();

const env = process.env;
const isProd = env.NODE_ENV === 'production';

if (isProd && (!env.SESSION_SECRET || env.SESSION_SECRET.startsWith('change-me'))) {
  throw new Error('SESSION_SECRET must be set to a strong value in production');
}

module.exports = {
  isProd,
  isTest: env.NODE_ENV === 'test',
  port: Number(env.PORT || 4000),
  db: {
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'hms',
    password: env.DB_PASSWORD || 'hms_pass',
    database: env.DB_NAME || 'hms',
  },
  sessionSecret: env.SESSION_SECRET || 'dev-only-secret',
  corsOrigin: env.CORS_ORIGIN || 'http://localhost:5173',
  emailDomain: (env.INSTITUTION_EMAIL_DOMAIN || '').toLowerCase(),
  tls: { key: env.TLS_KEY_PATH, cert: env.TLS_CERT_PATH },
  requireHttps: env.REQUIRE_HTTPS === 'true',
  smtp: {
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM || 'hms@example.edu',
  },
  bcryptRounds: env.NODE_ENV === 'test' ? 4 : 12,
};
