const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

let warden; let student1; let student2; let inv; let s1; let s2;

test.before(async () => {
  await h.resetDb();
  warden = await h.login(await h.mkUser('warden'));
  s1 = await h.mkUser('student', 1); s2 = await h.mkUser('student', 2);
  student1 = await h.login(s1);
  inv = await h.mkInventory(warden, 3, 'A');
});
test.after(h.closeAll);

test('TC-Room-01 inventory CRUD persists; deactivation refused while occupied', async () => {
  const tree = (await warden.get('/api/inventory')).body;
  assert.equal(tree[0].rooms[0].beds.length, 3);
  assert.equal((await warden.patch(`/api/beds/${inv.bedIds[2]}`).send({ label: '3A' })).status, 200);
  assert.equal((await warden.patch(`/api/beds/${inv.bedIds[2]}`).send({ isActive: false })).status, 200);
  assert.equal((await warden.get('/api/beds/available')).body.length, 2);
  assert.equal((await warden.post('/api/rooms').send({ blockId: inv.blockId, roomNumber: '101' })).status, 409); // duplicate
});

test('TC-Room-02 allocates only an available bed to an eligible student and updates occupancy', async () => {
  const ok = await warden.post('/api/allocations').send({ studentId: s1.id, bedId: inv.bedIds[0] });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.status, 'allocated');
  assert.equal((await warden.post('/api/allocations').send({ studentId: s2.id, bedId: inv.bedIds[0] })).body.errorCode, 'BED_UNAVAILABLE');
  assert.equal((await warden.post('/api/allocations').send({ studentId: s1.id, bedId: inv.bedIds[1] })).body.errorCode, 'STUDENT_INELIGIBLE');
  assert.equal((await warden.post('/api/allocations').send({ studentId: s2.id, bedId: inv.bedIds[2] })).body.errorCode, 'BED_UNAVAILABLE'); // inactive bed
  const occ = (await warden.get('/api/occupancy')).body;
  assert.equal(occ.occupied, 1); assert.equal(occ.totalBeds, 2);
  const mine = (await student1.get('/api/me/room')).body;
  assert.equal(mine.current.bedId, inv.bedIds[0]);
  assert.equal((await warden.patch(`/api/blocks/${inv.blockId}`).send({ isActive: false })).body.errorCode, 'OCCUPIED');
});

test('TC-Room-02b concurrent allocations of the same bed: exactly one succeeds (no double allocation)', async () => {
  const extra = [];
  for (let i = 3; i < 9; i += 1) extra.push(await h.mkUser('student', i));
  const fresh = (await warden.post('/api/beds').send({ roomId: inv.roomId, label: 'RACE' })).body.id;
  const results = await Promise.all(extra.map((s) => warden.post('/api/allocations').send({ studentId: s.id, bedId: fresh })));
  assert.equal(results.filter((r) => r.status === 201).length, 1);
  assert.ok(results.filter((r) => r.status === 409).length === extra.length - 1);
  const [[{ n }]] = await h.pool.query('SELECT COUNT(*) n FROM allocations WHERE bed_id = ? AND released_at IS NULL', [fresh]);
  assert.equal(n, 1);
});

test('TC-Room-03 transfer releases old bed and records new allocation atomically; failed transfer changes nothing', async () => {
  const cur = (await warden.get(`/api/allocations?studentId=${s1.id}`)).body[0];
  // target occupied -> 409 and original allocation untouched
  const [[occupiedBed]] = await h.pool.query('SELECT bed_id FROM allocations WHERE released_at IS NULL AND student_id <> ? LIMIT 1', [s1.id]);
  const bad = await warden.post(`/api/allocations/${cur.id}/transfer`).send({ targetBedId: occupiedBed.bed_id });
  assert.equal(bad.status, 409);
  assert.equal((await warden.get(`/api/allocations?studentId=${s1.id}`)).body[0].bedId, inv.bedIds[0]);
  // valid transfer
  const target = (await warden.post('/api/beds').send({ roomId: inv.roomId, label: 'T1' })).body.id;
  const ok = await warden.post(`/api/allocations/${cur.id}/transfer`).send({ targetBedId: target });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.oldBedReleased, true);
  const now = (await warden.get(`/api/allocations?studentId=${s1.id}`)).body;
  assert.equal(now.length, 1); assert.equal(now[0].bedId, target);
  const hist = (await warden.get(`/api/allocations?studentId=${s1.id}&scope=history`)).body;
  assert.equal(hist[0].status, 'transferred');
  assert.ok((await warden.get('/api/beds/available')).body.some((b) => b.id === inv.bedIds[0]));
});

test('TC-Room-04 check-in / check-out are recorded, release the bed, and keep history', async () => {
  const cur = (await warden.get(`/api/allocations?studentId=${s1.id}`)).body[0];
  assert.equal((await warden.post(`/api/allocations/${cur.id}/check-out`).send({})).status, 409); // not checked in yet
  assert.equal((await warden.post(`/api/allocations/${cur.id}/check-in`).send({ date: '2026-10-01' })).body.status, 'checked_in');
  assert.equal((await warden.post(`/api/allocations/${cur.id}/check-out`).send({ date: '2026-09-01' })).status, 400); // before check-in
  const out = await warden.post(`/api/allocations/${cur.id}/check-out`).send({ date: '2026-10-20' });
  assert.equal(out.body.status, 'checked_out');
  assert.equal((await warden.get(`/api/allocations?studentId=${s1.id}`)).body.length, 0);
  const mine = (await student1.get('/api/me/room')).body;
  assert.equal(mine.current, null);
  assert.ok(mine.history.some((a) => a.checkOutDate === '2026-10-20' && a.checkInDate === '2026-10-01'));
});
