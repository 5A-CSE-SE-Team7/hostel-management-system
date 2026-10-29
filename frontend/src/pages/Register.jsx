import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { post } from '../api.js';

const INITIAL_FORM = { srn: '', name: '', email: '', password: '', contact: '' };

export default function Register() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setError('');
    setMessage('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    setFieldErrors({});
    try {
      await post('/auth/register', form);
      setMessage('Your student account was created. You can now sign in.');
      setForm(INITIAL_FORM);
    } catch (err) {
      setFieldErrors(err.details || {});
      setError(err.details ? 'Please correct the highlighted fields.' : err.message || 'Registration failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const field = (name, label, options = {}) => (
    <label className="field" htmlFor={name} key={name}>
      <span>{label}</span>
      <input
        id={name}
        name={name}
        type={options.type || 'text'}
        value={form[name]}
        onChange={update}
        required
        autoComplete={options.autoComplete}
        minLength={options.minLength}
        maxLength={options.maxLength}
        aria-invalid={Boolean(fieldErrors[name])}
        aria-describedby={fieldErrors[name] ? `${name}-error` : undefined}
      />
      {fieldErrors[name] && <small className="field-error" id={`${name}-error`} role="alert">{fieldErrors[name]}</small>}
      {options.hint && <small className="hint">{options.hint}</small>}
    </label>
  );

  return (
    <main className="registration">
      <h1>Student registration</h1>
      <p className="intro">Register with your SRN and institutional email to access hostel services.</p>
      <form className="card" onSubmit={submit} noValidate>
        {error && <p className="alert" role="alert">{error}</p>}
        {message && <p className="success" role="status">{message}</p>}
        {field('srn', 'SRN', { hint: 'Use letters and numbers only.' })}
        {field('name', 'Full name', { autoComplete: 'name' })}
        {field('email', 'Institutional email', { type: 'email', autoComplete: 'email' })}
        {field('password', 'Password', { type: 'password', autoComplete: 'new-password', minLength: 8, maxLength: 72, hint: '8–72 characters with at least one letter and one number.' })}
        {field('contact', 'Contact number', { type: 'tel', autoComplete: 'tel' })}
        <button type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Register'}</button>
        <p>Already registered? <Link to="/login">Sign in</Link></p>
      </form>
    </main>
  );
}
