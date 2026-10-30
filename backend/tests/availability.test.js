const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const load = () => import('../scripts/monitoring/availability.mjs');
test('availability reports unknown gaps and failed duplicates honestly', async () => {
  const { summarize } = await load(); const from = '2026-10-01T00:00:00Z';
  const result = summarize([{ at: from, ok: true }, { at: from, ok: false }, { at: '2026-10-01T00:01:00Z', ok: true }], { start: from, end: '2026-10-01T00:03:00Z' });
  assert.equal(result.upMs, 60000); assert.equal(result.downMs, 60000); assert.equal(result.unknownMs, 60000); assert.equal(result.observedAvailabilityPercent, 50); assert.equal(result.monthlyTargetVerified, false);
});
test('only pre-announced maintenance is excluded; empty coverage is not success', async () => {
  const { summarize } = await load(); const start = '2026-10-01T00:00:00Z', end = '2026-10-01T00:02:00Z';
  const result = summarize([], { start, end, maintenance: [{ start, end, declaredAt: '2026-09-30T23:00:00Z', reason: 'Planned upgrade' }] });
  assert.equal(result.excludedMs, 120000); assert.equal(result.monthlyTargetVerified, false); assert.equal(result.observedAvailabilityPercent, null);
  assert.throws(() => summarize([], { start, end, maintenance: [{ start, end, declaredAt: start, reason: 'Retroactive' }] }));
});
test('health probe validates body/status and does not mistake an open port for availability', async t => {
  const { probe } = await load();
  const server = http.createServer((req,res) => { res.setHeader('content-type','application/json'); res.end(JSON.stringify({ status: req.url === '/healthy' ? 'ok' : 'degraded' })); });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await probe(`${base}/healthy`)).ok,true); assert.equal((await probe(`${base}/degraded`)).ok,false);
  await assert.rejects(probe('http://example.com/api/health'));
});
