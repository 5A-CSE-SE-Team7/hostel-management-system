import React, { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Badge, Input, Select, Table, fmtDate, useAction, useLoad } from '../components/ui.jsx';

export default function Leave() {
  const { user } = useAuth();
  const isStaff = user.role !== 'student';
  const { data, error, reload } = useLoad(() => api.get('/leave'));
  const blank = { type: 'outpass', fromAt: '', toAt: '', reason: '', destination: '' };
  const [form, setForm] = useState(blank);
  const [remarks, setRemarks] = useState({});
  const [st, run] = useAction(); const [rs, runRow] = useAction();

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...form, fromAt: form.fromAt && new Date(form.fromAt).toISOString(), toAt: form.toAt && new Date(form.toAt).toISOString() };
    if (!body.destination) delete body.destination;
    if (await run(() => api.post('/leave', body), 'Request submitted.')) { setForm(blank); reload(); }
  };
  const decide = (id, decision) => async () => { if (await runRow(() => api.post(`/leave/${id}/decision`, { decision, remarks: remarks[id] || undefined }), `Request ${decision}.`)) reload(); };
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
      <Table caption="Leave and outpass requests" rows={data} empty="No requests."
        columns={[{ header: '#', key: 'id' }, ...(isStaff ? [{ header: 'Student', key: 'studentName' }] : []), { header: 'Type', key: 'type' },
          { header: 'From', render: (l) => fmtDate(l.fromAt) }, { header: 'To', render: (l) => fmtDate(l.toAt) }, { header: 'Reason', key: 'reason' },
          { header: 'Status', render: (l) => <Badge value={l.status} /> }, { header: 'Remarks', key: 'remarks' },
          { header: 'Actions', render: (l) => {
            if (l.status !== 'pending') return '';
            if (!isStaff) return <button className="small secondary" onClick={async () => { if (await runRow(() => api.post(`/leave/${l.id}/cancel`), 'Request cancelled.')) reload(); }}>Cancel</button>;
            return (<div className="row" style={{ marginTop: 0 }}>
              <input aria-label={`Remarks for request ${l.id}`} placeholder="Remarks" value={remarks[l.id] || ''} onChange={(e) => setRemarks({ ...remarks, [l.id]: e.target.value })} style={{ maxWidth: 180 }} />
              <button className="small" onClick={decide(l.id, 'approved')}>Approve</button><button className="small danger" onClick={decide(l.id, 'rejected')}>Reject</button></div>);
          } }]} />
    </>
  );
}
