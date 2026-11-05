const test = require('node:test'); const assert = require('node:assert/strict'); const h = require('./helpers');
test.after(h.closeAll);
test('TC-Admin-04 period counts include checkouts from older allocations and occupancy at end date',async()=>{
 await h.resetDb(); const w=await h.login(await h.mkUser('warden'));const s=await h.mkUser('student');
 const {bedIds}=await h.mkInventory(w,1,'period');
 await h.pool.query("INSERT INTO allocations(student_id,bed_id,status,allocated_at,check_in_date,check_out_date,released_at) VALUES(?,?,'checked_out','2026-01-01 10:00:00','2026-01-02','2026-02-02','2026-02-02 10:00:00')",[s.id,bedIds[0]]);
 let r=await w.get('/api/reports/occupancy?from=2026-02-01&to=2026-02-28');assert.equal(r.status,200);
 assert.equal(r.body.allocations.checkOuts,1);assert.equal(r.body.allocations.newAllocations,0);assert.equal(r.body.occupancy.occupied,0);
 r=await w.get('/api/reports/occupancy?from=2026-01-01&to=2026-01-31');assert.equal(r.body.occupancy.occupied,1);assert.equal(r.body.allocations.checkIns,1);
 await h.pool.query('UPDATE beds SET is_active=0 WHERE id=?',[bedIds[0]]);
 r=await w.get('/api/reports/occupancy?from=2026-01-01&to=2026-01-31');assert.equal(r.body.occupancy.occupied,1);assert.equal(r.body.occupancy.currentTotalBeds,0);assert.equal(r.body.occupancy.totalBeds,null);assert.equal(r.body.occupancy.available,null);
 const maint=await h.login(await h.mkUser('maintenance'));const student=await h.login(s);
 for(const type of ['occupancy','allocations','complaints','fee-dues','visitors','leave']){
  assert.equal((await w.get(`/api/reports/${type}?from=2026-01-01&to=2026-12-31`)).status,200);
  assert.equal((await w.get(`/api/reports/${type}?format=csv`)).type,'text/csv');
  for(const actor of [maint,student])assert.equal((await actor.get(`/api/reports/${type}`)).status,403);
 }
 assert.equal((await w.get('/api/reports/occupancy?from=2026-02-30')).status,400);
});
