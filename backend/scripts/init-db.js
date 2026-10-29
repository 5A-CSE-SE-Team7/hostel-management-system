// Creates all tables from db/schema.sql. Usage: npm run db:init
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config');

(async () => {
  const conn = await mysql.createConnection({ ...config.db, multipleStatements: true });
  await conn.query(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
  await conn.end();
  console.log(`Schema applied to database "${config.db.database}"`);
})().catch((e) => { console.error(e); process.exit(1); });
