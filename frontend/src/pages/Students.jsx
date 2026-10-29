import React, { useState } from 'react';
import { api } from '../api.js';
import { Alert, Input, Table, useAction, useLoad } from '../components/ui.jsx';

export default function Students() {
  const [q, setQ] = useState('');
  const { data, error } = useLoad(() => api.get(`/students?q=${encodeURIComponent(q)}`), [q]);
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState({});
  const [st, run] = useAction();

  const open = async (id) => { const s = await api.get(`/students/${id}`); setSel(s); setForm(s); };
  const save = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(['name', 'contact', 'department', 'yearOfStudy', 'guardianName', 'guardianContact', 'address'].filter((k) => form[k] !== null && form[k] !== undefined && form[k] !== '').map((k) => [k, form[k]]));
    const r = await run(() => api.put(`/students/${sel.id}`, body), 'Student updated.');
    if (r) setSel(r);
  };
  const p = { form, setForm, errors: st.fieldErrors };
  return (
    <>
      <h2>Students</h2>
      <div className="card"><div className="field"><label htmlFor="q">Search by name, SRN or email</label><input id="q" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
      <Alert>{error}</Alert>
      <Table caption="Students" rows={data} empty="No students found."
        columns={[{ header: 'SRN', key: 'srn' }, { header: 'Name', key: 'name' }, { header: 'Email', key: 'email' }, { header: 'Contact', key: 'contact' }, { header: 'Dept', key: 'department' },
          { header: '', render: (s) => <button className="small secondary" onClick={() => open(s.id)}>View / edit</button> }]} />
      {sel && (
        <form className="card" onSubmit={save} noValidate style={{ marginTop: '1rem' }}>
          <h3>{sel.srn} – {sel.email}</h3><Alert>{st.error}</Alert><Alert kind="success">{st.ok}</Alert>
          <div className="form-grid">
            <Input {...p} name="name" label="Name" /><Input {...p} name="contact" label="Contact" /><Input {...p} name="department" label="Department" />
            <Input {...p} name="yearOfStudy" label="Year" type="number" /><Input {...p} name="guardianName" label="Guardian name" />
            <Input {...p} name="guardianContact" label="Guardian contact" /><Input {...p} name="address" label="Address" />
          </div>
          <div className="row"><button disabled={st.busy}>Save</button><button type="button" className="secondary" onClick={() => setSel(null)}>Close</button></div>
          <p className="muted">Viewing a student record is recorded in the audit log.</p>
        </form>
      )}
    </>
  );
}
