import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Alert, Input, useAction } from '../components/ui.jsx';

export default function Register() {
  const [form, setForm] = useState({ srn: '', name: '', email: '', password: '', contact: '', department: '', yearOfStudy: '', guardianName: '', guardianContact: '', address: '' });
  const [st, run] = useAction();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
    const r = await run(() => api.post('/auth/register', body), 'Account created. You can now sign in.');
    if (r) setTimeout(() => nav('/'), 1200);
  };

  const p = { form, setForm, errors: st.fieldErrors };
  return (
    <div className="auth wide">
      <h1>Student registration</h1>
      <form className="card" onSubmit={submit} noValidate>
        <Alert>{st.error}</Alert><Alert kind="success">{st.ok}</Alert>
        <div className="form-grid">
          <Input {...p} name="srn" label="SRN" required hint="e.g. PES2UG24CS001" />
          <Input {...p} name="name" label="Full name" required />
          <Input {...p} name="email" label="Institutional email" type="email" required />
          <Input {...p} name="password" label="Password" type="password" required autoComplete="new-password" hint="8+ characters with a letter and a digit" />
          <Input {...p} name="contact" label="Contact number" type="tel" required />
          <Input {...p} name="department" label="Department" />
          <Input {...p} name="yearOfStudy" label="Year of study" type="number" min="1" max="8" />
          <Input {...p} name="guardianName" label="Guardian name" />
          <Input {...p} name="guardianContact" label="Guardian contact" type="tel" />
          <Input {...p} name="address" label="Home address" />
        </div>
        <div className="row"><button type="submit" disabled={st.busy}>Register</button><Link to="/">Back to sign in</Link></div>
      </form>
    </div>
  );
}
