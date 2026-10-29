import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Input, useAction, useLoad } from '../components/ui.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const { data, error } = useLoad(() => api.get('/profile'));
  const [form, setForm] = useState({});
  const [st, run] = useAction();
  useEffect(() => { if (data) setForm({ ...data }); }, [data]);

  const save = async (e) => {
    e.preventDefault();
    const fields = user.role === 'student' ? ['name', 'contact', 'department', 'yearOfStudy', 'guardianName', 'guardianContact', 'address'] : ['name'];
    const body = Object.fromEntries(fields.filter((f) => form[f] !== undefined && form[f] !== null && form[f] !== '').map((f) => [f, form[f]]));
    const r = await run(() => api.put('/profile', body), 'Profile updated.');
    if (r) setUser({ ...user, name: r.name });
  };
  const p = { form, setForm, errors: st.fieldErrors };
  return (
    <>
      <h2>My profile</h2><Alert>{error}</Alert>
      <form className="card" onSubmit={save} noValidate>
        <Alert>{st.error}</Alert><Alert kind="success">{st.ok}</Alert>
        <div className="form-grid">
          <Input {...p} name="name" label="Full name" />
          <div className="field"><label>Email</label><input value={form.email ?? ''} readOnly aria-readonly="true" /></div>
          {user.role === 'student' && (<>
            <div className="field"><label>SRN</label><input value={form.srn ?? ''} readOnly aria-readonly="true" /></div>
            <Input {...p} name="contact" label="Contact number" type="tel" />
            <Input {...p} name="department" label="Department" />
            <Input {...p} name="yearOfStudy" label="Year of study" type="number" min="1" max="8" />
            <Input {...p} name="guardianName" label="Guardian name" />
            <Input {...p} name="guardianContact" label="Guardian contact" type="tel" />
            <Input {...p} name="address" label="Home address" />
          </>)}
        </div>
        <p className="muted">SRN, email and role can only be changed by the System Administrator.</p>
        <div className="row"><button type="submit" disabled={st.busy}>Save changes</button></div>
      </form>
    </>
  );
}
