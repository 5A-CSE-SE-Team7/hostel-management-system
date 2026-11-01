process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'hms_test';
process.env.SESSION_SECRET = 'test-secret';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const config = require('../src/config');
const { pool } = require('../src/db');
const { createApp } = require('../src/app');

// Keep test login credentials aligned with the documented, synthetic demo accounts.
const PASSWORD = 'Hostel@123';
const app = createApp();

async function resetDb() {
  if (!config.isTest || !config.db.database.endsWith('_test')) {
    throw new Error(`Refusing to reset non-test database: ${config.db.database}`);
  }
  const conn = await mysql.createConnection({ ...config.db, multipleStatements: true });
  try {
    const [tables] = await conn.query('SHOW TABLES');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of tables) await conn.query(`DROP TABLE IF EXISTS \`${Object.values(table)[0]}\``);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.query(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
  } finally {
    await conn.end();
  }
}

async function mkUser(role, n = 1) {
  const email = `${role}${n}@t.test`;
  const hash = await bcrypt.hash(PASSWORD, 4);
  const [r] = await pool.query('INSERT INTO users (email, password_hash, name, role) VALUES (?,?,?,?)', [email, hash, `${role} ${n}`, role]);
  if (role === 'student') {
    await pool.query('INSERT INTO students (user_id, srn, contact) VALUES (?,?,?)', [r.insertId, `PES2UG24CS${900 + n}`, '9000000000']);
  }
  return { id: r.insertId, email, role };
}

async function login(user) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email: user.email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed for ${user.email}: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

/** Creates one block / room / N beds and returns their ids. */
async function mkInventory(agent, beds = 2, suffix = '') {
  const b = (await agent.post('/api/blocks').send({ name: `Block ${suffix || Math.random().toString(36).slice(2, 6)}` })).body;
  const r = (await agent.post('/api/rooms').send({ blockId: b.id, roomNumber: '101', floor: 1 })).body;
  const bedIds = [];
  for (let i = 1; i <= beds; i += 1) bedIds.push((await agent.post('/api/beds').send({ roomId: r.id, label: String(i) })).body.id);
  return { blockId: b.id, roomId: r.id, bedIds };
}

async function seedCategory(name = 'Electrical') {
  const [r] = await pool.query('INSERT INTO complaint_categories (name) VALUES (?)', [name]);
  return r.insertId;
}

async function closeAll() { await pool.end(); if (app.locals.sessionStore) await app.locals.sessionStore.close(); }

module.exports = { app, request, pool, PASSWORD, resetDb, mkUser, login, mkInventory, seedCategory, closeAll };
