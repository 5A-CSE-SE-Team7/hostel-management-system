import React, { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Badge, Input, Select, Table, fmtDate, useAction, useLoad } from '../components/ui.jsx';

function NewComplaint({ onDone }) {
  const cats = useLoad(() => api.get('/complaint-categories'));
  const [form, setForm] = useState({ categoryId: '', location: '', description: '', attachmentRef: '' });
  const [st, run] = useAction();
  const submit = async (e) => {
    e.preventDefault();
    const body = { ...form, categoryId: Number(form.categoryId) };
    if (!body.attachmentRef) delete body.attachmentRef;
    const r = await run(() => api.post('/complaints', body), 'Complaint submitted.');
    if (r) { setForm({ categoryId: '', location: '', description: '', attachmentRef: '' }); onDone(); }
  };
  const p = { form, setForm, errors: st.fieldErrors };
  return (
    <form className="card" onSubmit={submit} noValidate>
      <h3>Submit a complaint</h3><Alert>{st.error}</Alert><Alert kind="success">{st.ok}</Alert>
      <div className="form-grid">
        <Select {...p} name="categoryId" label="Category" required options={(cats.data || []).map((c) => ({ value: c.id, label: c.name }))} />
        <Input {...p} name="location" label="Location (block/room)" required />
        <Input {...p} name="attachmentRef" label="Attachment / reference (optional)" />
      </div>
      <div className="field"><label htmlFor="f-description">Description *</label>
        <textarea id="f-description" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} aria-invalid={!!st.fieldErrors.description} />
        {st.fieldErrors.description && <small className="field-error">{st.fieldErrors.description}</small>}</div>
      <div className="row"><button type="submit" disabled={st.busy}>Submit complaint</button></div>
    </form>
  );
}

function StaffActions({ c, staffList, onDone, role }) {
  const [assignee, setAssignee] = useState(c.assignedTo || '');
  const [priority, setPriority] = useState(c.priority);
  const [details, setDetails] = useState('');
  const [st, run] = useAction();
  const isStaff = role === 'warden' || role === 'admin';
  const canProgress = c.status === 'assigned' || c.status === 'in_progress' || (c.status === 'resolved' && isStaff);
  return (
    <div>
      <Alert>{st.error}</Alert>
      {isStaff && c.status !== 'resolved' && (
        <div className="row">
          <select aria-label={`Assignee for complaint ${c.id}`} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Assign to…</option>{staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select aria-label={`Priority for complaint ${c.id}`} value={priority} onChange={(e) => setPriority(e.target.value)}>
            {['low', 'medium', 'high', 'urgent'].map((x) => <option key={x}>{x}</option>)}
          </select>
          <button className="small" disabled={!assignee || st.busy} onClick={async () => { if (await run(() => api.post(`/complaints/${c.id}/assign`, { assignedTo: Number(assignee), priority }), 'Assigned')) onDone(); }}>Assign</button>
        </div>
      )}
      {canProgress && c.status !== 'resolved' && (
        <div className="row">
          {c.status === 'assigned' && <button className="small secondary" onClick={async () => { if (await run(() => api.patch(`/complaints/${c.id}/status`, { status: 'in_progress' }))) onDone(); }}>Start work</button>}
          <input aria-label={`Resolution details for complaint ${c.id}`} placeholder="Resolution details" value={details} onChange={(e) => setDetails(e.target.value)} style={{ maxWidth: 240 }} />
          <button className="small" disabled={!details} onClick={async () => { if (await run(() => api.patch(`/complaints/${c.id}/status`, { status: 'resolved', resolutionDetails: details }))) onDone(); }}>Mark resolved</button>
        </div>
      )}
      {c.status === 'resolved' && <small className="muted">Resolved: {c.resolutionDetails}</small>}
    </div>
  );
}

export default function Complaints() {
  const { user } = useAuth();
  const { data, error, reload } = useLoad(() => api.get('/complaints'));
  const staff = useLoad(async () => (user.role === 'warden' || user.role === 'admin' ? api.get('/maintenance-staff') : []), [user.role]);
  const cols = [
    { header: '#', key: 'id' },
    ...(user.role !== 'student' ? [{ header: 'Student', key: 'studentName' }] : []),
    { header: 'Category', key: 'category' }, { header: 'Location', key: 'location' }, { header: 'Description', key: 'description' },
    { header: 'Priority', render: (c) => <Badge value={c.priority} /> }, { header: 'Status', render: (c) => <Badge value={c.status} /> },
    { header: 'Assigned to', render: (c) => c.assignedToName || '—' }, { header: 'Updated', render: (c) => fmtDate(c.updatedAt) },
    ...(user.role !== 'student' ? [{ header: 'Actions', render: (c) => <StaffActions c={c} staffList={staff.data || []} onDone={reload} role={user.role} /> }]
      : [{ header: 'Resolution', render: (c) => c.resolutionDetails || '' }]),
  ];
  return (
    <>
      <h2>{user.role === 'maintenance' ? 'Assigned maintenance work' : 'Complaints'}</h2>
      {user.role === 'student' && <NewComplaint onDone={reload} />}
      <Alert>{error}</Alert>
      <Table caption="Complaints" columns={cols} rows={data} empty="No complaints." />
    </>
  );
}
