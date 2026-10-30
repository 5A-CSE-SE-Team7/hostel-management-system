const test = require('node:test');
const assert = require('node:assert/strict');
const { validate, isValidCalendarDate } = require('../src/utils/validate');
test('calendar helper accepts leap dates and MySQL boundary years', () => {
  for (const value of ['2028-02-29','2026-10-30','1000-01-01','9999-12-31']) assert.equal(isValidCalendarDate(value), true);
});
test('calendar helper safely rejects wrong JSON types and impossible calendars', () => {
  for (const value of [null,{},[],['2026-10-30'],true,1,'2026-02-29','2026-02-30','2026-13-01','0100-01-01']) assert.equal(isValidCalendarDate(value), false);
});
for (const type of ['date', 'datetime']) {
  test(`${type} rejects wrong JSON types with structured 400 errors`, () => {
    for (const value of [{},[],[type === 'date' ? '2026-10-30' : '2026-10-30T10:00:00Z'],true,1]) {
      assert.throws(() => validate({ at: value }, { at: { type, required: true } }), e => e.status === 400 && !!e.details.at);
    }
  });
  test(`${type} rejects impossible dates without JavaScript rollover`, () => {
    for (const date of ['2026-02-29','2026-02-30','2026-13-01','0100-01-01']) {
      const value = type === 'date' ? date : `${date}T10:00:00Z`;
      assert.throws(() => validate({ at: value }, { at: { type, required: true } }), e => e.status === 400 && !!e.details.at);
    }
  });
}
test('datetime preserves UTC conversion while rejecting out-of-range normalized years', () => {
  assert.equal(validate({at:'2028-02-29T12:34:56+05:30'},{at:{type:'datetime'}}).at,'2028-02-29 07:04:56');
  for (const at of ['1000-01-01T00:00:00+14:00','9999-12-31T23:59:00-14:00']) {
    assert.throws(() => validate({at},{at:{type:'datetime'}}),e=>e.status===400);
  }
});

for (const type of ['int','number']) {
  test(`${type} rejects JSON boolean/array coercion but preserves numeric strings`, () => {
    for (const at of [true,false,[1],[],{}]) assert.throws(() => validate({at},{at:{type}}),e=>e.status===400);
    assert.equal(validate({at:'5'},{at:{type}}).at,5);
  });
}
