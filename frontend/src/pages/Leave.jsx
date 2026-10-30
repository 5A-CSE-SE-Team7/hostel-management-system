import React, { useState } from 'react';
import { get, post, patch } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Badge, Input, Select, Table, fmtDate, useAction, useLoad, toUtc } from '../components/m4-ui.jsx';

export default function Leave() {
  const { user } = useAuth();
  if (!['student','warden','admin'].includes(user?.role)) return <><h2>Access denied</h2><Alert>You do not have permission to view these records.</Alert></>;
  return <LeaveRecords user={user} />;
}
function LeaveRecords({ user }) {
  const isStaff = ['warden', 'admin'].includes(user.role);
  const { data, error, loading, reload } = useLoad(() => get('/leave'));
  const blank = { type: 'outpass', fromAt: '', toAt: '', reason: '', destination: '' };
  const [form, setForm] = useState(blank);
  const [remarks, setRemarks] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [st, run] = useAction(); const [rs, runRow] = useAction();

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...form, fromAt: form.fromAt && toUtc(form.fromAt), toAt: form.toAt && toUtc(form.toAt) };
    if (!body.destination) delete body.destination;
    if (await run(() => post('/leave', body), 'Request submitted.')) { setForm(blank); reload(); }
  };
  const decide = (id, decision) => async () => { setActiveId(id); if (await runRow(() => post(`/leave/${id}/decision`, { decision, remarks: remarks[id] || undefined }), `Request ${decision}.`)) reload(); };
  const p = { form, setForm, errors: st.fieldErrors };

  return (
    <>
      <h2>Leave & outpass</h2>
      {!isStaff && (
        <form className="card" onSubmit={submit} noValidate><h3>New request</h3><Alert>{st.error}</Alert><Alert kind="success">{st.ok}</Alert>
          <div className="form-grid">
            <Select {...p} name="type" label="Type" required options={['outpass', 'leave']} />
            <Input {...p} name="fromAt" label="From" type="datetime-local" required />
            <Input {...p} name="toAt" label="To" type="datetime-local" required />
            <Input {...p} name="reason" label="Reason" required />
            <Input {...p} name="destination" label="Destination" />
          </div>
          <div className="row"><button disabled={st.busy}>Submit request</button></div></form>
      )}
      <Alert>{error}</Alert><Alert>{rs.error}</Alert><Alert kind="success">{rs.ok}</Alert>
      <Table loading={loading} error={error} caption="Leave and outpass requests" rows={data} empty="No requests."
        columns={[{ header: '#', key: 'id' }, ...(isStaff ? [{ header: 'Student', key: 'studentName' }] : []), { header: 'Type', key: 'type' },
          { header: 'From', render: (l) => fmtDate(l.fromAt) }, { header: 'To', render: (l) => fmtDate(l.toAt) }, { header: 'Reason', key: 'reason' },
          { header: 'Status', render: (l) => <Badge value={l.status} /> }, { header: 'Remarks', key: 'remarks' },
          { header: 'Actions', render: (l) => {
            if (l.status !== 'pending') return '';
            if (!isStaff) return <button className="small secondary" onClick={async () => { if (await runRow(() => post(`/leave/${l.id}/cancel`), 'Request cancelled.')) reload(); }}>Cancel</button>;
            return (<div className="row" style={{ marginTop: 0 }}>
              <label htmlFor={`remarks-${l.id}`}>Remarks for request {l.id}</label><input id={`remarks-${l.id}`} aria-invalid={activeId === l.id && !!rs.fieldErrors.remarks} aria-describedby={activeId === l.id && rs.fieldErrors.remarks ? `remarks-error-${l.id}` : undefined} placeholder="Remarks" value={remarks[l.id] || ''} onChange={(e) => setRemarks({ ...remarks, [l.id]: e.target.value })} style={{ maxWidth: 180 }} />
              {activeId === l.id && rs.fieldErrors.remarks && <span className="error" id={`remarks-error-${l.id}`}>{rs.fieldErrors.remarks}</span>}<button disabled={rs.busy} className="small" onClick={decide(l.id, 'approved')}>Approve</button><button disabled={rs.busy} className="small danger" onClick={decide(l.id, 'rejected')}>Reject</button></div>);
          } }]} />
    </>
  );
}
