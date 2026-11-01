import React, { useState } from 'react';
import { get, post, patch } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Badge, Input, Select, Table, fmtDate, useAction, useLoad, toUtc } from '../components/m4-ui.jsx';

export default function Visitors() {
  const { user } = useAuth();
  if (!['student','warden','admin'].includes(user?.role)) return <><h2>Access denied</h2><Alert>You do not have permission to view these records.</Alert></>;
  return <VisitorsRecords user={user} />;
}
function VisitorsRecords({ user }) {
  const isStaff = ['warden', 'admin'].includes(user.role);
  const { data, error, loading, reload } = useLoad(() => get('/visitors'));
  const students = useLoad(async () => (isStaff ? get('/students') : []), [isStaff]);
  const blank = { studentId: '', visitorName: '', idType: '', idNumber: '', relation: '', visitAt: '', purpose: '' };
  const [form, setForm] = useState(blank);
  const [st, run] = useAction(); const [rs, runRow] = useAction();

  const submit = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
    if (body.studentId) body.studentId = Number(body.studentId);
    if (body.visitAt) body.visitAt = toUtc(body.visitAt);
    if (await run(() => post('/visitors', body), isStaff ? 'Visitor recorded.' : 'Visitor request submitted for approval.')) { setForm(blank); reload(); }
  };
  const p = { form, setForm, errors: st.fieldErrors };
  const act = (id, status) => async () => { if (await runRow(() => patch(`/visitors/${id}/status`, { status }), 'Updated.')) reload(); };

  return (
    <>
      <h2>Visitors</h2>
      <form className="card" onSubmit={submit} noValidate><h3>{isStaff ? 'Record a visitor' : 'Register a visitor'}</h3><Alert>{st.error}</Alert><Alert kind="success">{st.ok}</Alert>
        <div className="form-grid">
          {isStaff && <Select {...p} name="studentId" label="Student" required options={(students.data || []).map((s) => ({ value: s.id, label: `${s.srn} – ${s.name}` }))} />}
          <Input {...p} name="visitorName" label="Visitor name" required />
          <Input {...p} name="idType" label="ID type" required hint="e.g. Aadhaar, Driving licence" />
          <Input {...p} name="idNumber" label="ID number" required />
          <Input {...p} name="relation" label="Relation to student" />
          <Input {...p} name="visitAt" label="Visit date & time" type="datetime-local" required />
          <Input {...p} name="purpose" label="Purpose" required />
        </div>
        <div className="row"><button disabled={st.busy}>Save</button></div></form>
      <Alert>{error}</Alert><Alert>{rs.error}</Alert>
      <Table loading={loading} error={error} caption="Visitor records" rows={data} empty="No visitor records."
        columns={[{ header: 'Visit time', render: (v) => fmtDate(v.visitAt) }, ...(isStaff ? [{ header: 'Student', key: 'studentName' }] : []),
          { header: 'Visitor', key: 'visitorName' }, { header: 'ID', render: (v) => `${v.idType}: ${v.idNumber}` }, { header: 'Purpose', key: 'purpose' },
          { header: 'Status', render: (v) => <Badge value={v.status} /> },
          ...(isStaff ? [{ header: 'Actions', render: (v) => (
            <div className="row" style={{ marginTop: 0 }}>
              {v.status === 'pending' && <><button disabled={rs.busy} className="small" onClick={act(v.id, 'approved')}>Approve</button><button disabled={rs.busy} className="small danger" onClick={act(v.id, 'rejected')}>Reject</button></>}
              {v.status === 'approved' && <button disabled={rs.busy} className="small secondary" onClick={act(v.id, 'completed')}>Mark completed</button>}
            </div>) }] : [])]} />
    </>
  );
}
