// Pure unit tests - no database required (runs in CI before integration tests).
process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('../src/utils/validate');
const { computeHash, GENESIS } = require('../src/utils/audit');
const { requireRole } = require('../src/middleware/auth');

test('validate: required, types, enum and trimming', () => {
  const out = validate({ a: '  hi ', n: '5', e: 'X@Y.com' }, { a: { required: true }, n: { type: 'int', min: 1 }, e: { type: 'email' } });
  assert.deepEqual(out, { a: 'hi', n: 5, e: 'x@y.com' });
  assert.throws(() => validate({}, { a: { required: true } }), (e) => e.status === 400 && !!e.details.a);
  assert.throws(() => validate({ r: 'z' }, { r: { enum: ['a', 'b'] } }), (e) => !!e.details.r);
  assert.throws(() => validate({ d: '2026-13-45' }, { d: { type: 'date' } }));
});

test('audit hash chain is deterministic and sensitive to every field', () => {
  const row = { user_id: 1, role: 'warden', action: 'X', entity: 'e', entity_id: '1', details: '{}', ip: '::1', created_at: '2026-10-29 10:00:00.000' };
  const h1 = computeHash(GENESIS, row);
  assert.equal(h1, computeHash(GENESIS, row));
  assert.notEqual(h1, computeHash(GENESIS, { ...row, details: '{"a":1}' }));
  assert.notEqual(h1, computeHash('1'.repeat(64), row));
});

test('requireRole blocks other roles and unauthenticated callers (HMS-SR-003)', () => {
  const run = (session) => { let err; requireRole('admin')({ session }, {}, (e) => { err = e; }); return err; };
  assert.equal(run(undefined).status, 401);
  assert.equal(run({ user: { role: 'student' } }).status, 403);
  assert.equal(run({ user: { role: 'admin' } }), undefined);
});
