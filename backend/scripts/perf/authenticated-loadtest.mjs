import { writeFileSync } from 'node:fs';
import { cpus, totalmem } from 'node:os';
import { pathToFileURL } from 'node:url';
export const workload = [
 {path:'/api/auth/me', valid:d=>Number(d?.id)>0&&typeof d?.role==='string'},
 {path:'/api/profile', valid:d=>Number(d?.id)>0},
 {path:'/api/complaints?limit=10', valid:Array.isArray},
 {path:'/api/occupancy', valid:d=>Number.isInteger(d?.totalBeds)&&Number.isInteger(d?.occupiedBeds)},
 {path:'/api/fees/dues', valid:Array.isArray},
];
export function maximum(values){return values.reduce((a,b)=>Math.max(a,b),0);}

function integerSetting(name, fallback, minimum, maximum) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function percentile(values, proportion = 0.9) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * proportion) - 1];
}

function successRate(successes, total) {
  return total ? Math.round((successes / total) * 10000) / 100 : 0;
}

function localOrHttps(url) {
  return url.protocol === 'https:'
    || (url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
}

async function responseJson(response) {
  try { return await response.json(); } catch { return null; }
}

async function login(base, email, password, timeoutMs, delayMs) {
  if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
  const started = performance.now();
  let status = null;
  let data = null;
  let cookie = null;
  try {
    const response = await fetch(new URL('/api/auth/login', base), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
    });
    status = response.status;
    data = await responseJson(response);
    const setCookies = response.headers.getSetCookie?.() ?? [];
    cookie = setCookies.find((value) => value.startsWith('hms.sid='))?.split(';', 1)[0] ?? null;
  } catch { /* Save a failed sample without retaining response data or secrets. */ }
  const durationMs = Math.round((performance.now() - started) * 100) / 100;
  const ok = status === 200 && data?.sessionStatus === 'active' && Number(data?.userId) > 0 && cookie !== null;
  return { status, durationMs, ok, cookie };
}

async function authenticatedRequest(base, cookie, timeoutMs, endpoint) {
  const started = performance.now();
  let status = null;
  let data = null;
  try {
    const response = await fetch(new URL(endpoint.path, base), {
      headers: { Cookie: cookie },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
    });
    status = response.status;
    data = await responseJson(response);
  } catch { /* Save a failed sample without retaining response data or secrets. */ }
  const durationMs = Math.round((performance.now() - started) * 100) / 100;
  const ok = status === 200 && endpoint.valid(data);
  return { endpoint: endpoint.path, status, durationMs, ok };
}

async function main() {
  const base = new URL(process.env.LOADTEST_BASE_URL || 'http://127.0.0.1:4000');
  if (base.username || base.password) throw new Error('Do not put credentials in LOADTEST_BASE_URL');
  if (!localOrHttps(base)) throw new Error('Remote load-test targets must use HTTPS');

  const email = process.env.PERF_EMAIL || 'admin@hms.test';
  const password = process.env.PERF_PASSWORD;
  if (!password) throw new Error('Set PERF_PASSWORD to a synthetic test account password');

  const virtualUsers = integerSetting('LOADTEST_VUS', 500, 1, 500);
  const durationSeconds = integerSetting('LOADTEST_DURATION_SECONDS', 30, 1, 3600);
  const rampUpSeconds = integerSetting('LOADTEST_RAMP_UP_SECONDS', 30, 0, 3600);
  const timeoutMs = integerSetting('LOADTEST_TIMEOUT_MS', 5000, 100, 60000);
  const outputPath = process.argv[2] || 'performance-results.json';
  const startedAt = new Date().toISOString();
  const loginSamples = [];

  const sessions = (await Promise.all(Array.from({ length: virtualUsers }, async (_, index) => {
    const delayMs = virtualUsers > 1 ? Math.floor((index * rampUpSeconds * 1000) / virtualUsers) : 0;
    const result = await login(base, email, password, timeoutMs, delayMs);
    loginSamples.push({ status: result.status, ok: result.ok, durationMs: result.durationMs });
    return result.ok ? result.cookie : null;
  }))).filter(Boolean);

  const uniqueSessions = new Set(sessions).size;
  const requestSamples = [];
  const workloadStartedAt = new Date().toISOString();
  const deadline = performance.now() + durationSeconds * 1000;

  await Promise.all(sessions.map(async (cookie) => {
    let iteration=0;
    do {
      requestSamples.push(await authenticatedRequest(base, cookie, timeoutMs, workload[iteration++ % workload.length]));
    } while (performance.now() < deadline);
  }));

  const loginSuccesses = loginSamples.filter((sample) => sample.ok).length;
  const requestSuccesses = requestSamples.filter((sample) => sample.ok).length;
  const loginDurations = loginSamples.map((sample) => sample.durationMs);
  const requestDurations = requestSamples.map((sample) => sample.durationMs);
  const loginErrors = loginSamples.length - loginSuccesses;
  const requestErrors = requestSamples.length - requestSuccesses;
  const result = {
    issue: 'HMS-NF-002',
    applicationCommit: process.env.HMS_APPLICATION_COMMIT || null,
    startedAt,
    workloadStartedAt,
    endedAt: new Date().toISOString(),
    environment: { node: process.version, cpus: cpus().length, memoryBytes: totalmem() },
    target: base.origin,
    workload: workload.map(e=>e.path),
    accountModel: 'Independent authenticated sessions sharing one synthetic warden/admin account',
    virtualUsersRequested: virtualUsers,
    authenticatedVirtualUsers: uniqueSessions,
    durationSeconds,
    rampUpSeconds,
    timeoutMs,
    login: {
      attempted: loginSamples.length,
      successes: loginSuccesses,
      errors: loginErrors,
      successRatePercent: successRate(loginSuccesses, loginSamples.length),
      p90Ms: percentile(loginDurations),
      maxMs: loginDurations.length ? maximum(loginDurations) : null,
    },
    authenticatedRequests: {
      total: requestSamples.length,
      successes: requestSuccesses,
      errors: requestErrors,
      successRatePercent: successRate(requestSuccesses, requestSamples.length),
      p90Ms: percentile(requestDurations),
      maxMs: requestDurations.length ? maximum(requestDurations) : null,
    },
    status: loginSuccesses === virtualUsers && uniqueSessions === virtualUsers
      && requestSamples.length > 0 && requestErrors === 0 ? 'PASS' : 'FAIL',
    // No credentials, session cookies, or response bodies are included in the report.
    samples: {
      login: loginSamples.map(({ status, ok, durationMs }) => ({ status, ok, durationMs })),
      authenticatedRequests: requestSamples,
    },
  };

  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, { flag: 'w' });
  console.log(JSON.stringify({
    status: result.status,
    virtualUsers: result.authenticatedVirtualUsers,
    loginSuccessRatePercent: result.login.successRatePercent,
    authenticatedRequestSuccessRatePercent: result.authenticatedRequests.successRatePercent,
    requestCount: result.authenticatedRequests.total,
    requestP90Ms: result.authenticatedRequests.p90Ms,
    report: outputPath,
  }, null, 2));
  if (result.status !== 'PASS') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
