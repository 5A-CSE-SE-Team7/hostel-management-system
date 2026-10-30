import React, { useState } from 'react';
import { get, post, patch } from '../api.js';
import { useAuth } from '../auth.jsx';
import { getReportCsv } from './report-api';
import { Alert, Input, Select, Table, useAction } from '../components/m4-ui.jsx';

const TYPES = [
  { value: 'occupancy', label: 'Occupancy' }, { value: 'allocations', label: 'Allocations' }, { value: 'complaints', label: 'Complaints' },
  { value: 'fee-dues', label: 'Fee dues' }, { value: 'visitors', label: 'Visitors' }, { value: 'leave', label: 'Leave / outpass' },
];
const today = new Date().toISOString().slice(0, 10);

export default function Reports() {
  const { user } = useAuth();
  if (!['warden','admin'].includes(user?.role)) return <><h2>Access denied</h2><Alert>You do not have permission to view reports.</Alert></>;
  return <ReportForm />;
}
function ReportForm() {
  const [form, setForm] = useState({ type: 'occupancy', from: `${today.slice(0, 8)}01`, to: today });
  const [report, setReport] = useState(null);
  const [st, run] = useAction();
  const [csvState, runCsv] = useAction();

  const generate = async (e) => { e.preventDefault(); const r = await run(() => get(`/reports/${form.type}?from=${form.from}&to=${form.to}`), 'Report generated.'); if (r) setReport(r); };
  const download = async () => {
    const csv = await runCsv(() => getReportCsv(`/reports/${report.type}?${new URLSearchParams({ from: report.period.from, to: report.period.to, format: "csv" })}`));
    if (csv === null) return;
    const a = document.createElement('a'), url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.href = url; a.download = `${report.type}_${report.period.from}_${report.period.to}.csv`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const rows = report?.rows || report?.occupancy?.byBlock;
  const cols = rows?.length ? Object.keys(rows[0]).map((k) => ({ header: k, render: (r) => String(r[k] ?? '') })) : [];

  return (
    <>
      <h2>Reports</h2>
      <form className="card" onSubmit={generate} noValidate>
        <div className="form-grid">
          <Select form={form} setForm={setForm} name="type" label="Report" options={TYPES} required />
          <Input errors={st.fieldErrors} form={form} setForm={setForm} name="from" label="From" type="date" required />
          <Input errors={st.fieldErrors} form={form} setForm={setForm} name="to" label="To" type="date" required />
        </div>
        <Alert>{st.error || csvState.error}</Alert>
        <div className="row"><button disabled={st.busy}>Generate</button><button type="button" className="secondary" onClick={download} disabled={!report || csvState.busy}>Download CSV</button></div>
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
