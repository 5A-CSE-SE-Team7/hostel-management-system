const test=require('node:test');const assert=require('node:assert/strict');
test('load runner handles large sample sets and validates representative protected responses',async()=>{
 const {maximum,workload}=await import('../scripts/perf/authenticated-loadtest.mjs');
 assert.equal(maximum(Array.from({length:200000},(_,i)=>i)),199999);
 assert.ok(workload.length>=5);assert.equal(workload.find(e=>e.path==='/api/auth/me').valid({}),false);
 assert.equal(workload.find(e=>e.path==='/api/occupancy').valid({totalBeds:10,occupiedBeds:3}),true);
});
