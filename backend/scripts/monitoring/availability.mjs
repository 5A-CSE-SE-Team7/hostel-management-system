import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
export async function probe(url, { timeoutMs = 3000 } = {}) {
  const target = new URL(url);
  if (target.username || target.password) throw new Error('Do not embed credentials in monitoring URLs');
  if (target.protocol !== 'https:' && !(target.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname))) throw new Error('Monitoring requires HTTPS outside local development');
  const at = new Date().toISOString(), begin = performance.now();
  try {
    const response = await fetch(target, { signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
    const body = await response.json();
    return { at, ok: response.status === 200 && body.status === 'ok', httpStatus: response.status, durationMs: Math.round((performance.now() - begin) * 100) / 100 };
  } catch (_) { return { at, ok: false, httpStatus: null, durationMs: Math.round((performance.now() - begin) * 100) / 100 }; }
}
export function summarize(samples, { start, end, intervalMs = 60000, maintenance = [], now = Date.now() }) {
  const from = Date.parse(start), to = Date.parse(end);
  if (![from, to, intervalMs].every(Number.isFinite) || from >= to || intervalMs < 1000 || from % intervalMs || to % intervalMs) throw new Error('Use valid, interval-aligned start/end and interval >=1000ms');
  const exclusions = maintenance.map(item => {
    const a = Date.parse(item.start), b = Date.parse(item.end), declared = Date.parse(item.declaredAt);
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(declared) || a >= b || declared >= a || !item.reason?.trim()) throw new Error('Maintenance needs a valid pre-announced window, declaredAt and reason');
    return [a, b];
  });
  const buckets = new Map();
  for (const sample of samples) {
    const at = Date.parse(sample.at); if (!Number.isFinite(at) || typeof sample.ok !== 'boolean') throw new Error('Invalid observation record');
    const bucket = Math.floor(at / intervalMs) * intervalMs;
    // A failed duplicate dominates success; retries cannot erase downtime.
    buckets.set(bucket, buckets.has(bucket) ? buckets.get(bucket) && sample.ok : sample.ok);
  }
  let upMs = 0, downMs = 0, unknownMs = 0, excludedMs = 0;
  for (let at = from; at < to; at += intervalMs) {
    const ranges = exclusions.map(([a,b]) => [Math.max(a, at), Math.min(b, at + intervalMs)]).filter(([a,b]) => b > a).sort((a,b) => a[0]-b[0]);
    let excluded = 0, last = at;
    for (const [a,b] of ranges) { excluded += Math.max(0, b - Math.max(a,last)); last = Math.max(last,b); }
    const eligible = intervalMs - excluded; excludedMs += excluded;
    if (!buckets.has(at)) unknownMs += eligible;
    else if (buckets.get(at)) upMs += eligible;
    else downMs += eligible;
  }
  const observed = upMs + downMs, eligible = observed + unknownMs;
  const availability = observed ? 100 * upMs / observed : null;
  const a = new Date(from), next = Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + 1, 1);
  const fullCalendarMonth = a.getUTCDate() === 1 && a.getUTCHours() === 0 && a.getUTCMinutes() === 0 && a.getUTCSeconds() === 0 && next === to;
  return { start, end, intervalMs, upMs, downMs, unknownMs, excludedMs, coveragePercent: eligible ? 100 * observed / eligible : null, observedAvailabilityPercent: availability, fullCalendarMonth, monthlyTargetVerified: fullCalendarMonth && to <= now && unknownMs === 0 && observed > 0 && availability >= 99.5 };
}
async function main() {
  const [command, ...args] = process.argv.slice(2); const options = Object.fromEntries(args.map(value => { const [key,...rest] = value.replace(/^--/,'').split('='); return [key,rest.join('=')]; }));
  if (command === 'probe') {
    if (!options.url || !options.output) throw new Error('probe requires --url=... --output=...');
    const result = await probe(options.url); appendFileSync(options.output, `${JSON.stringify(result)}\n`); console.log(JSON.stringify(result)); if (!result.ok) process.exitCode = 1;
  } else if (command === 'report') {
    const samples = readFileSync(options.input, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    const maintenance = options.maintenance ? JSON.parse(readFileSync(options.maintenance,'utf8')) : [];
    console.log(JSON.stringify(summarize(samples, { start: options.start, end: options.end, intervalMs: Number(options.interval || 60000), maintenance }), null, 2));
  } else throw new Error('Use probe or report');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
