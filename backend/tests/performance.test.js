const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
test('nearest-rank p90 includes outliers at the correct rank', async () => {
  const { percentile } = await import('../scripts/perf/benchmark.mjs'); assert.equal(percentile([10,9,8,7,6,5,4,3,2,1]),9); assert.equal(percentile([]),null);
});
test('benchmark authenticates, validates every endpoint and reports unexpected bodies as failures', async t => {
  const { benchmark } = await import('../scripts/perf/benchmark.mjs'); let broken = false;
  const server = http.createServer((req,res) => {
    res.setHeader('content-type','application/json');
    if(req.url === '/api/auth/login') { res.setHeader('set-cookie','hms.sid=test; HttpOnly'); res.end(JSON.stringify({ sessionStatus:'active' })); return; }
    if(req.url === '/api/auth/logout') { res.end('{}'); return; }
    assert.equal(req.headers.cookie,'hms.sid=test');
    if(broken) { res.end('{}'); return; }
    res.end(JSON.stringify(req.url.includes('/reports/occupancy') ? { type:'occupancy',occupancy:{} } : req.url.includes('/reports/complaints') ? { type:'complaints',rows:[] } : []));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const options={base:`http://127.0.0.1:${server.address().port}`,email:'synthetic',password:'synthetic',concurrency:2,iterations:2};
  const good=await benchmark(options);assert.equal(good.status,'PASS');assert.equal(good.samples.length,26);
  broken=true;const bad=await benchmark(options);assert.equal(bad.status,'FAIL');assert.equal(bad.endpoints.inventory.errors,4);
});
