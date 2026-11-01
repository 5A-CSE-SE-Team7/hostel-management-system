// Dependency compatibility checks only; does not implement login or audit logic.
const { createRequire } = require('node:module');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const backendRequire = createRequire(path.resolve(__dirname, '../../backend/package.json'));
const config = backendRequire('./src/config');
const MySQLStore = backendRequire('express-mysql-session')(backendRequire('express-session'));
const nodemailer = backendRequire('nodemailer');

(async () => {
  if (config.db.database !== 'hms_test') throw new Error('Dependency smoke checks require DB_NAME=hms_test');
  const store = new MySQLStore({ ...config.db, createDatabaseTable: false, clearExpired: false });
  const id = `ci-smoke-${randomUUID()}`;
  try {
    await store.onReady();
    await store.set(id, { compatibility: 'mysql2', cookie: { maxAge: 60000 } });
    assert.equal((await store.get(id)).compatibility, 'mysql2');
    await store.touch(id, {});
    await store.destroy(id);
    assert.equal(await store.get(id), null);
    console.log('PASS: patched mysql2 session-store write/read/touch/delete');
  } finally {
    try { await store.destroy(id); } finally { await store.close(); }
  }
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
  const result = await transport.sendMail({ from: 'hms@hms.test', to: 'student@hms.test', subject: 'Compatibility smoke', text: 'Synthetic test; no SMTP connection.' });
  assert.match(result.message.toString(), /Subject: Compatibility smoke/);
  assert.match(result.message.toString(), /Synthetic test/);
  transport.close();
  console.log('PASS: patched Nodemailer message compilation (no external delivery)');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
