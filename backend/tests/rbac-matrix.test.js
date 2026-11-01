const test = require('node:test');const assert = require('node:assert/strict');const h=require('./helpers');
const roles=['student','warden','maintenance','admin'];const staff=['warden','admin'];
const policy={
 auth:{'post /logout':roles,'get /me':roles},
 profile:{'get /profile':roles,'put /profile':roles,'get /students':staff,'get /students/:id':staff,'put /students/:id':staff},
 admin:{'get /users':['admin'],'post /users':['admin'],'patch /users/:id':['admin'],'get /audit':['admin'],'get /audit/verify':['admin']},
 inventory:Object.fromEntries(['get /inventory','post /blocks','patch /blocks/:id','post /rooms','patch /rooms/:id','post /beds','patch /beds/:id'].map(k=>[k,staff])),
 allocations:Object.fromEntries(['get /beds/available','get /occupancy','get /allocations','get /allocations/history','post /allocations','post /allocations/:id/transfer','post /allocations/:id/check-in','post /allocations/:id/check-out'].map(k=>[k,staff]).concat([['get /me/room',['student']]])),
 complaints:{'get /complaint-categories':roles,'post /complaints':['student'],'get /complaints':roles,'get /complaints/:id':roles,'get /maintenance-staff':staff,'post /complaints/:id/assign':staff,'patch /complaints/:id/priority':staff,'patch /complaints/:id/status':['maintenance',...staff]},
 notifications:Object.fromEntries(['get /notifications','get /notifications/unread-count','post /notifications/read-all','post /notifications/:id/read'].map(k=>[k,roles])),
 fees:{'post /fees/assessments':staff,'post /fees/payments':staff,'get /fees/me':['student'],'get /fees/ledger/:studentId':staff,'get /fees/dues':staff},
 visitors:{'post /visitors':['student',...staff],'get /visitors':['student',...staff],'patch /visitors/:id/status':staff},
 leave:{'post /leave':['student'],'get /leave':['student',...staff],'post /leave/:id/decision':staff,'post /leave/:id/cancel':['student']},
 reports:{'get /:type':staff},
};
test.after(h.closeAll);
test('TC-Sec-03 every protected route denies unauthenticated and wrong-role real sessions',async()=>{
 await h.resetDb();const clients={};for(const role of roles)clients[role]=await h.login(await h.mkUser(role));
 let tested=0;
 for(const [module,rules]of Object.entries(policy)){
  const router=require('../src/routes/'+module);
  for(const layer of router.stack.filter(l=>l.route))for(const method of Object.keys(layer.route.methods)){
   const key=method+' '+layer.route.path;
   if(module==='auth'&&['post /login','post /register'].includes(key))continue;
   assert.ok(rules[key],`Missing role policy for ${module}: ${key}`);
   const prefix=module==='auth'?'/api/auth':module==='admin'?'/api/admin':module==='reports'?'/api/reports':'/api';
   const path=prefix+layer.route.path.replace(/:type/g,'occupancy').replace(/:[A-Za-z]+/g,'1');
   const anon=await h.request(h.app)[method](path).send({});assert.equal(anon.status,401,`anonymous ${method} ${path}`);
   for(const role of roles.filter(r=>!rules[key].includes(r))){const r=await clients[role][method](path).send({});assert.equal(r.status,403,`${role} ${method} ${path}: ${JSON.stringify(r.body)}`);}
   tested++;
  }
 }
 assert.ok(tested>=50,`Expected complete endpoint inventory, saw ${tested}`);
});
