import React, { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Badge, Input, Select, Table, useAction, useLoad } from '../components/ui.jsx';

export default function Users() {
  const { user } = useAuth();
  const { data, error, reload } = useLoad(() => api.get('/admin/users'));
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'warden' });
  const [st, run] = useAction();
  const patch = (id, body) => async () => { if (await run(() => api.patch(`/admin/users/${id}`, body), 'User updated.')) reload(); };

  return (
    <>
      <h2>Users & roles</h2><Alert>{error}</Alert>
      <form className="card" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api.post('/admin/users', form), 'Staff account created.')) { setForm({ name: '', email: '', password: '', role: 'warden' }); reload(); } }} noValidate>
        <h3>Create staff account</h3><Alert>{st.error}</Alert><Alert kind="success">{st.ok}</Alert>
        <div className="form-grid">
          <Input form={form} setForm={setForm} name="name" label="Name" required errors={st.fieldErrors} />
          <Input form={form} setForm={setForm} name="email" label="Email" type="email" required errors={st.fieldErrors} />
          <Input form={form} setForm={setForm} name="password" label="Initial password" type="password" required errors={st.fieldErrors} autoComplete="new-password" />
          <Select form={form} setForm={setForm} name="role" label="Role" required options={['warden', 'maintenance', 'admin']} />
        </div>
        <div className="row"><button disabled={st.busy}>Create</button></div>
      </form>
      <Table caption="Users" rows={data} empty="No users."
        columns={[{ header: 'Name', key: 'name' }, { header: 'Email', key: 'email' }, { header: 'Role', render: (u) => <Badge value={u.role} /> },
          { header: 'Active', render: (u) => (u.isActive ? 'Yes' : 'No') },
          { header: 'Actions', render: (u) => u.id === user.id ? <span className="muted">(you)</span> : (
            <div className="row" style={{ marginTop: 0 }}>
              {u.role !== 'student' && <select aria-label={`Role for ${u.name}`} value={u.role} onChange={(e) => patch(u.id, { role: e.target.value })()}>{['warden', 'maintenance', 'admin'].map((r) => <option key={r}>{r}</option>)}</select>}
              <button className="small secondary" onClick={patch(u.id, { isActive: !u.isActive })}>{u.isActive ? 'Deactivate' : 'Activate'}</button>
            </div>) }]} />
    </>
  );
}
