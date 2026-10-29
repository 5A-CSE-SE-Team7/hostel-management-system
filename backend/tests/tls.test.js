// TC-Sec-01: real TLS handshakes and HTTP guard, no fake auth or audit.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const https = require('node:https');
const tls = require('node:tls');
const { randomBytes } = require('node:crypto');
const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
async function start(t, options) {
  const child = spawn(process.execPath, [resolve(__dirname, '../src/server.js')], { env: { ...env, NODE_ENV: 'production', SESSION_SECRET: randomBytes(32).toString('hex'), PORT: '0', HOST: '127.0.0.1', TRUST_PROXY: '', TLS_KEY_PATH: '', TLS_CERT_PATH: '', ...options }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { child.kill('SIGTERM'); });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server readiness timed out')), 10000);
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
    child.stdout.on('data', data => { const port = data.toString().match(/listening on https?:\/\/127.0.0.1:(\d+)/)?.[1]; if (port) { clearTimeout(timer); resolve(Number(port)); } });
  });
}
test('TC-Sec-01 production rejects HTTP health and spoofed proxy protocol', async t => {
  const port = await start(t, {});
  for (const headers of [{}, { 'X-Forwarded-Proto': 'https' }]) {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, { headers });
    assert.equal(response.status, 426); assert.equal((await response.json()).errorCode, 'HTTPS_REQUIRED');
  }
});
test('TC-Sec-01 genuine TLS 1.2/1.3 work; TLS 1.0/1.1 are refused', async t => {
  const root = mkdtempSync(join(tmpdir(), 'hms-tls-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const cert = join(root, 'cert.pem'), key = join(root, 'key.pem');
  const generated = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1', '-keyout', key, '-out', cert], { encoding: 'utf8' });
  assert.equal(generated.status, 0);
  const port = await start(t, { TLS_KEY_PATH: key, TLS_CERT_PATH: cert });
  const ca = readFileSync(cert);
  for (const version of ['TLSv1.2', 'TLSv1.3']) {
    await new Promise((resolve, reject) => {
      const socket = tls.connect({ host: '127.0.0.1', port, ca, minVersion: version, maxVersion: version }, () => { assert.equal(socket.getProtocol(), version); socket.end(); resolve(); }); socket.on('error', reject);
    });
  }
  for (const flag of ['-tls1', '-tls1_1']) {
    const result = spawnSync('openssl', ['s_client', '-connect', `127.0.0.1:${port}`, flag, '-cipher', 'ALL:@SECLEVEL=0'], { input: '', encoding: 'utf8', timeout: 10000 });
    assert.notEqual(result.status, 0); assert.match(result.stderr, /alert protocol version/i);
  }
  await new Promise((resolve, reject) => {
    https.get({ host: '127.0.0.1', port, path: '/api/health', ca }, response => {
      assert.match(response.headers['strict-transport-security'], /max-age=31536000/); response.resume(); response.on('end', resolve);
    }).on('error', reject);
  });
});
