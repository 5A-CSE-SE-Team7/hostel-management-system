import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { cpus, totalmem } from 'node:os';
export function percentile(values, proportion = 0.9) {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b) => a-b); return sorted[Math.ceil(sorted.length * proportion)-1];
}
export const workload = [
  { name: 'inventory', path: '/api/inventory', valid: data => Array.isArray(data) },
  { name: 'allocations', path: '/api/allocations', valid: data => Array.isArray(data) },
  { name: 'complaint_tracking', path: '/api/complaints?limit=100', valid: data => Array.isArray(data) },
  { name: 'dashboard_fee_dues', path: '/api/fees/dues', valid: data => Array.isArray(data) },
  { name: 'occupancy_report', path: '/api/reports/occupancy', valid: data => data.type === 'occupancy' && !!data.occupancy },
  { name: 'complaint_report', path: '/api/reports/complaints', valid: data => data.type === 'complaints' && Array.isArray(data.rows) },
];
export async function benchmark({ base, email, password, concurrency = 5, iterations = 20, timeoutMs = 5000, thresholdMs = 3000 }) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 50 || !Number.isInteger(iterations) || iterations < 1 || iterations > 1000) throw new Error('Use concurrency 1..50 and iterations 1..1000');
  if (!email || !password) throw new Error('PERF_EMAIL and PERF_PASSWORD are required');
  const url = new URL(base);
  if (url.username || url.password) throw new Error('Do not embed credentials in URLs');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1','localhost','[::1]'].includes(url.hostname))) throw new Error('Remote workloads require HTTPS');
  const samples = [], startedAt = new Date().toISOString();
  async function request(name, path, options = {}, valid = () => true) {
    const begin = performance.now(); let status = null, ok = false, cookie = null;
    try {
      const response = await fetch(new URL(path, url), { ...options, signal: AbortSignal.timeout(timeoutMs), redirect: 'error' }); status = response.status;
      const data = await response.json(); ok = response.ok && valid(data);
      cookie = response.headers.getSetCookie().find(value => value.startsWith('hms.sid='))?.split(';')[0];
    } catch (_) { /* record failed/timeout measurements, never response secrets */ }
    const durationMs = Math.round((performance.now()-begin)*100)/100; samples.push({ name, status, ok, durationMs }); return { ok, cookie };
  }
  await Promise.all(Array.from({ length: concurrency }, async () => {
    const login = await request('login', '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) }, data => data.sessionStatus === 'active');
    if (!login.ok || !login.cookie) return;
    try {
      for (let iteration = 0; iteration < iterations; iteration += 1) {
        for (const endpoint of workload) await request(endpoint.name, endpoint.path, { headers: { Cookie: login.cookie } }, endpoint.valid);
      }
    } finally { await fetch(new URL('/api/auth/logout',url), { method: 'POST', headers: { Cookie: login.cookie }, signal: AbortSignal.timeout(timeoutMs) }).catch(() => {}); }
  }));
  const endpoints = Object.fromEntries(['login', ...workload.map(row => row.name)].map(name => {
    const rows = samples.filter(row => row.name === name), p90Ms = percentile(rows.map(row => row.durationMs));
    const expected = name === 'login' ? concurrency : concurrency*iterations;
    const errors = rows.filter(row => !row.ok).length;
    return [name, { expected, count: rows.length, errors, p90Ms, maxMs: rows.length ? Math.max(...rows.map(row => row.durationMs)) : null, status: rows.length === expected && errors === 0 && p90Ms <= thresholdMs ? 'PASS' : rows.length !== expected ? 'BLOCKED' : 'FAIL' }];
  }));
  return { startedAt, endedAt: new Date().toISOString(), environment: { node: process.version, cpus: cpus().length, memoryBytes: totalmem() }, concurrency, iterations, thresholdMs, timeoutMs, includesLogin: true, warmupExcluded: 0, browserRenderMeasured: false, endpoints, status: Object.values(endpoints).every(row => row.status === 'PASS') ? 'PASS' : 'FAIL', samples };
}
async function main() {
  const output = process.argv[2]; if (!output) throw new Error('Specify output JSON path');
  const result = await benchmark({ base: process.env.PERF_BASE || 'http://127.0.0.1:4000', email: process.env.PERF_EMAIL, password: process.env.PERF_PASSWORD, concurrency: Number(process.env.PERF_CONCURRENCY || 5), iterations: Number(process.env.PERF_ITERATIONS || 20) });
  writeFileSync(output, JSON.stringify(result,null,2)+'\n'); console.log(JSON.stringify({ status: result.status, endpoints: result.endpoints },null,2)); if(result.status !== 'PASS') process.exitCode=1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode=1; });
