import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const workflow = name => readFileSync(new URL(`../../.github/workflows/${name}.yml`, import.meta.url), 'utf8');
function block(text, step) {
  const tail = text.split(`- name: ${step}\n`)[1];
  assert.ok(tail, `missing step ${step}`);
  const lines = tail.split('run: |\n')[1].split('\n');
  const result = [];
  for (const line of lines) {
    if (line.trim() && !line.startsWith('          ')) break;
    result.push(line.slice(10));
  }
  return result.join('\n');
}
const reference = block(workflow('pr-checks'), 'Check for "Closes #N" / "Fixes #N" / "Refs #N"');
for (const body of ['Refs #4', 'Closes #3', 'Fixes #16', 'RESOLVES #123']) {
  test(`backlog validator accepts ${body}`, () => assert.equal(spawnSync('bash', ['-e', '-c', reference], { env: { ...process.env, BODY: body } }).status, 0));
}
for (const body of ['', 'HMS-S04', 'Refs #not-a-number']) {
  test(`backlog validator rejects ${JSON.stringify(body)}`, () => assert.equal(spawnSync('bash', ['-e', '-c', reference], { env: { ...process.env, BODY: body } }).status, 1));
}
test('Project preflight fails clearly without credentials, accepts valid metadata', () => {
  const preflight = block(workflow('project-automation'), 'Validate Project configuration');
  for (const values of [{ PROJECT_URL: '', PROJECT_TOKEN: '' }, { PROJECT_URL: 'https://example.test/project', PROJECT_TOKEN: 'test-only' }]) {
    const r = spawnSync('bash', ['-e', '-c', preflight], { env: { ...process.env, ...values }, encoding: 'utf8' });
    assert.equal(r.status, 1); assert.match(r.stdout, /::error::/);
  }
  assert.equal(spawnSync('bash', ['-e', '-c', preflight], { env: { ...process.env, PROJECT_URL: 'https://github.com/orgs/test/projects/1', PROJECT_TOKEN: 'test-only' } }).status, 0);
});
test('privileged Project workflow never checks out or executes PR code', () => {
  const project = workflow('project-automation');
  assert.match(project, /pull_request_target:/);
  assert.match(project, /permissions: \{\}/);
  assert.doesNotMatch(project, /actions\/checkout|github\.event\.pull_request\.(head|body|title)|npm |node /);
});
test('integration runner rejects empty suite and preserves real test failures', () => {
  const root = mkdtempSync(join(tmpdir(), 'hms-integration-runner-'));
  const script = resolve('scripts/ci/integration-tests.mjs');
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const run = () => spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', env });
  try {
    mkdirSync(join(root, 'tests'));
    let r = run(); assert.equal(r.status, 1); assert.match(r.stderr, /BLOCKED/);
    writeFileSync(join(root, 'tests', 'unit.test.js'), 'throw new Error("unit file must not run here")');
    assert.equal(run().status, 1);
    writeFileSync(join(root, 'tests', 'example.test.js'), 'require("node:test")("runner fixture", () => {});');
    assert.equal(run().status, 0);
    writeFileSync(join(root, 'tests', 'example.test.js'), 'require("node:test")("runner fixture", () => { throw new Error("intentional fixture failure"); });');
    assert.equal(run().status, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('CI runs tests and build, with separate advisory audits', () => {
  const ci = workflow('ci');
  assert.match(ci, /Frontend automated tests\n\s+run: npm test/);
  assert.match(ci, /run: npm run test:unit/);
  assert.match(ci, /run: node ..\/scripts\/ci\/integration-tests.mjs/);
  assert.match(ci, /component: \[backend, frontend\]/);
  assert.match(ci, /fail-fast: false/);
  assert.match(ci, /npm audit --audit-level=high/);
  assert.doesNotMatch(ci, /passWithNoTests|audit-level=critical|\|\| true/);
});
test('action pins belong to their own official repositories (PR 41 regression)', () => {
  // Verified with git ls-remote per repository and raw action.yml retrieval.
  // These v6 tags resolve differently; swapping their SHAs breaks job setup.
  const published = {
    'actions/checkout': 'd23441a48e516b6c34aea4fa41551a30e30af803',
    'actions/setup-node': '249970729cb0ef3589644e2896645e5dc5ba9c38',
    'actions/add-to-project': '244f685bbc3b7adfa8466e08b698b5577571133e',
  };
  for (const file of ['ci', 'pr-checks', 'project-automation']) {
    for (const [, repo, revision] of workflow(file).matchAll(/uses:\s+([^@\s]+)@([^\s]+)/g)) {
      assert.ok(published[repo], `verify newly added action ${repo} before pinning`);
      assert.equal(revision, published[repo], `${repo} must use its own published revision`);
    }
  }
});
test('combined validation preserves real failures and isolates proposed owner changes', () => {
  const ci=workflow('ci');
  assert.match(ci,/Verify actual combined owner contracts/);
  assert.match(ci,/run: bash scripts\/ci\/combined-integration.sh\n/);
  const script=readFileSync(new URL('../../scripts/ci/combined-integration.sh',import.meta.url),'utf8');
  assert.match(script,/exit 2/); assert.match(script,/--with-proposed-staff-export/);
  assert.match(script,/exit "\$result"/); assert.match(script,/No teammate source was changed/);
});
