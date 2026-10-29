import React, { useState } from 'react';
import { api } from '../api.js';
import { Alert, Badge, Select, Table, useAction, useLoad } from '../components/ui.jsx';

export default function Allocations() {
  const alloc = useLoad(() => api.get('/allocations'));
  const hist = useLoad(() => api.get('/allocations?scope=history'));
  const beds = useLoad(() => api.get('/beds/available'));
  const students = useLoad(() => api.get('/students'));
  const occ = useLoad(() => api.get('/occupancy'));
  const [form, setForm] = useState({ studentId: '', bedId: '' });
  const [target, setTarget] = useState({});
  const [st, run] = useAction();
  const refresh = () => { alloc.reload(); hist.reload(); beds.reload(); occ.reload(); };

  const allocatedIds = new Set((alloc.data || []).map((a) => a.studentId));
  const unallocated = (students.data || []).filter((s) => !allocatedIds.has(s.id) && s.isActive);
  const bedOpts = (beds.data || []).map((b) => ({ value: b.id, label: `${b.blockName} / ${b.roomNumber} / Bed ${b.label}` }));

  const go = (fn, msg) => async () => { if (await run(fn, msg)) refresh(); };

  return (
    <>
      <h2>Room & bed allocation</h2>
      <Alert>{alloc.error || beds.error}</Alert><Alert>{st.error}</Alert><Alert kind="success">{st.ok}</Alert>
      {occ.data && <p className="muted">Occupancy: {occ.data.occupied} of {occ.data.totalBeds} active beds occupied.</p>}
      <form className="card" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api.post('/allocations', { studentId: Number(form.studentId), bedId: Number(form.bedId) }), 'Bed allocated.')) { setForm({ studentId: '', bedId: '' }); refresh(); } }}>
        <h3>Allocate a bed</h3>
        <div className="form-grid">
          <Select form={form} setForm={setForm} name="studentId" label="Student (without a bed)" required options={unallocated.map((s) => ({ value: s.id, label: `${s.srn} – ${s.name}` }))} />
          <Select form={form} setForm={setForm} name="bedId" label="Available bed" required options={bedOpts} />
        </div>
        <div className="row"><button disabled={st.busy}>Allocate</button></div>
      </form>
      <section className="card"><h3>Current allocations</h3>
        <Table caption="Current allocations" rows={alloc.data} empty="No current allocations."
          columns={[{ header: 'Student', render: (a) => `${a.srn || ''} ${a.studentName}` }, { header: 'Bed', render: (a) => `${a.blockName} / ${a.roomNumber} / ${a.bedLabel}` },
            { header: 'Status', render: (a) => <Badge value={a.status} /> }, { header: 'Check-in', key: 'checkInDate' },
            { header: 'Actions', render: (a) => (
              <div className="row" style={{ marginTop: 0 }}>
                {a.status === 'allocated' && <button className="small" onClick={go(() => api.post(`/allocations/${a.id}/check-in`), 'Checked in.')}>Check in</button>}
                {a.status === 'checked_in' && <button className="small" onClick={go(() => api.post(`/allocations/${a.id}/check-out`), 'Checked out.')}>Check out</button>}
                <select aria-label={`Transfer ${a.studentName} to bed`} value={target[a.id] || ''} onChange={(e) => setTarget({ ...target, [a.id]: e.target.value })}>
                  <option value="">Transfer to…</option>{bedOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button className="small secondary" disabled={!target[a.id]} onClick={go(() => api.post(`/allocations/${a.id}/transfer`, { targetBedId: Number(target[a.id]) }), 'Transferred.')}>Transfer</button>
              </div>) }]} /></section>
      <section className="card"><h3>Occupancy history</h3>
        <Table caption="Allocation history" rows={hist.data} empty="No history yet."
          columns={[{ header: 'Student', key: 'studentName' }, { header: 'Bed', render: (a) => `${a.blockName} / ${a.roomNumber} / ${a.bedLabel}` },
            { header: 'Check-in', key: 'checkInDate' }, { header: 'Check-out', key: 'checkOutDate' }, { header: 'Outcome', render: (a) => <Badge value={a.status} /> }]} /></section>
    </>
  );
}
