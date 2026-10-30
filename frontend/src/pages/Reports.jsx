import React, { useState } from 'react';
import { api } from '../api.js';
import { Alert, Input, Select, Table, useAction } from '../components/ui.jsx';

const TYPES = [
  { value: 'occupancy', label: 'Occupancy' }, { value: 'allocations', label: 'Allocations' }, { value: 'complaints', label: 'Complaints' },
  { value: 'fee-dues', label: 'Fee dues' }, { value: 'visitors', label: 'Visitors' }, { value: 'leave', label: 'Leave / outpass' },
];
const today = new Date().toISOString().slice(0, 10);

export default function Reports() {
  const [form, setForm] = useState({ type: 'occupancy', from: `${today.slice(0, 8)}01`, to: today });
  const [report, setReport] = useState(null);
  const [st, run] = useAction();

  const generate = async (e) => { e.preventDefault(); const r = await run(() => api.get(`/reports/${form.type}?from=${form.from}&to=${form.to}`), 'Report generated.'); if (r) setReport(r); };
  const download = async () => {
    const csv = await api.get(`/reports/${form.type}?from=${form.from}&to=${form.to}&format=csv`);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `${form.type}_${form.from}_${form.to}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  const rows = report?.rows || report?.occupancy?.byBlock;
  const cols = rows?.length ? Object.keys(rows[0]).map((k) => ({ header: k, render: (r) => String(r[k] ?? '') })) : [];

  return (
    <>
      <h2>Reports</h2>
      <form className="card" onSubmit={generate} noValidate>
        <div className="form-grid">
          <Select form={form} setForm={setForm} name="type" label="Report" options={TYPES} required />
          <Input form={form} setForm={setForm} name="from" label="From" type="date" required />
          <Input form={form} setForm={setForm} name="to" label="To" type="date" required />
        </div>
        <Alert>{st.error}</Alert>
        <div className="row"><button disabled={st.busy}>Generate</button><button type="button" className="secondary" onClick={download} disabled={!report}>Download CSV</button></div>
      </form>
      {report && (
        <section className="card"><h3>{TYPES.find((t) => t.value === report.type)?.label} · {report.period.from} to {report.period.to}</h3>
          {report.summary && <pre>{JSON.stringify(report.summary, null, 2)}</pre>}
          {report.occupancy && <p>Occupied {report.occupancy.occupied} / {report.occupancy.totalBeds} beds. New allocations: {report.allocations.newAllocations}, transfers: {report.allocations.transfers}, check-ins: {report.allocations.checkIns}, check-outs: {report.allocations.checkOuts}.</p>}
          <Table caption="Report data" columns={cols} rows={rows} empty="No rows for this period." />
        </section>
      )}
    </>
  );
}
