import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, put } from '../api.js';

const STUDENT_FIELDS = [
  ['contact', 'Contact number', 'tel'],
  ['department', 'Department', 'text'],
  ['yearOfStudy', 'Year of study', 'number'],
  ['guardianName', 'Guardian name', 'text'],
  ['guardianContact', 'Guardian contact', 'tel'],
  ['address', 'Home address', 'text'],
];

function field(name, label, value, onChange, options = {}) {
  return (
    <label className="field" htmlFor={`profile-${name}`} key={name}>
      <span>{label}</span>
      <input
        id={`profile-${name}`}
        name={name}
        type={options.type || 'text'}
        value={value ?? ''}
        onChange={onChange}
        readOnly={options.readOnly}
        disabled={options.disabled}
        min={options.type === 'number' ? 1 : undefined}
        max={options.type === 'number' ? 8 : undefined}
      />
    </label>
  );
}

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    get('/profile')
      .then((data) => { setProfile(data); setForm(data); })
      .catch((err) => setError(err.message || 'Could not load your profile.'));
  }, []);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const saved = await put('/profile', form);
      setProfile(saved);
      setForm(saved);
      setSuccess('Profile updated.');
    } catch (err) {
      setError(err.details ? Object.values(err.details).join(' ') : err.message || 'Could not update your profile.');
    } finally {
      setBusy(false);
    }
  };

  if (!profile && !error) return <main className="registration" role="status">Loading profile…</main>;
  if (!profile) return <main className="registration"><p className="alert" role="alert">{error}</p><Link to="/">Back</Link></main>;

  return (
    <main className="registration">
      <h1>My profile</h1>
      <p className="intro">Update your permitted details. SRN, email, and role are protected.</p>
      <form className="card" onSubmit={submit}>
        {error && <p className="alert" role="alert">{error}</p>}
        {success && <p className="success" role="status">{success}</p>}
        {field('srn', 'SRN', profile.srn, () => {}, { readOnly: true })}
        {field('email', 'Email', profile.email, () => {}, { readOnly: true })}
        {field('role', 'Role', profile.role, () => {}, { readOnly: true })}
        {field('name', 'Full name', form.name, update)}
        {profile.role === 'student' && STUDENT_FIELDS.map(([name, label, type]) => field(name, label, form[name], update, { type }))}
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
        <Link to="/">Back to dashboard</Link>
      </form>
    </main>
  );
}
