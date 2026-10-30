const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
test('required auth initialization errors propagate instead of silently disabling routes', () => {
  const script = `
    process.env.NODE_ENV='test';
    const Module=require('node:module'); const load=Module._load;
    const expected=new Error('intentional auth initialization failure');
    Module._load=function(name,...args){if(name==='./routes/auth')throw expected;return load.call(this,name,...args);};
    try { require('./src/app').createApp(); process.exit(2); }
    catch(error) { if(error!==expected)throw error; }
  `;
  const result = spawnSync(process.execPath,['-e',script], {cwd:path.resolve(__dirname,'..'),env:{...process.env,NODE_ENV:'test'},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});
