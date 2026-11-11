import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err.status === 401 ? 'Invalid email or password.' : err.message || 'Sign in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="registration">
      <h1>Hostel Management System</h1>
      <p className="intro">Sign in with your institutional account.</p>
      <form className="card" onSubmit={submit} noValidate>
        {error && <p className="alert" role="alert">{error}</p>}
        <label className="field" htmlFor="login-email">
          <span>Institutional email</span>
          <input id="login-email" name="email" type="email" autoComplete="username" required value={form.email} onChange={update} />
        </label>
        <label className="field" htmlFor="login-password">
          <span>Password</span>
          <input id="login-password" name="password" type="password" autoComplete="current-password" required value={form.password} onChange={update} />
        </label>
        <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p>New student? <Link to="/register">Create an account</Link></p>
      </form>
    </main>
  );
}
