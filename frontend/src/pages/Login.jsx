import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { errorText } from '../api.js';
import { Alert, Input } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(form.email, form.password); } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };

  return (
    <div className="auth">
      <h1>Hostel Management System</h1>
      <form className="card" onSubmit={submit} noValidate>
        <h2>Sign in</h2>
        <Alert>{error}</Alert>
        <Input form={form} setForm={setForm} name="email" label="Institutional email" type="email" required autoComplete="username" />
        <Input form={form} setForm={setForm} name="password" label="Password" type="password" required autoComplete="current-password" />
        <div className="row"><button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></div>
        <p>New student? <Link to="/register">Create an account</Link></p>
      </form>
    </div>
  );
}
