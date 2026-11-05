const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {spawnSync}=require('node:child_process');
test('TC-Rel-02 failed dumps never publish backups; archive and target guards precede restore',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hms-backup-test-'));
 try{
  fs.writeFileSync(path.join(root,'mysqldump'),'#!/bin/sh\necho partial\nexit 7\n',{mode:0o700});
  const env={...process.env,PATH:root+':'+process.env.PATH,DB_NAME:'hms_test',DB_PASSWORD:'synthetic',BACKUP_DIR:path.join(root,'backups')};
  const result=spawnSync('bash',['scripts/backup.sh'],{cwd:path.join(__dirname,'..'),env,encoding:'utf8'});
  assert.notEqual(result.status,0);assert.deepEqual(fs.readdirSync(env.BACKUP_DIR),[]);
  const file=path.join(root,'invalid.sql.gz');fs.writeFileSync(file,'not gzip');
  assert.notEqual(spawnSync('bash',['scripts/restore.sh',file],{cwd:path.join(__dirname,'..'),env}).status,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
