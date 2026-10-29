import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { get, patch, post } from '../api.js';

const STAFF_ROLES = ['warden', 'maintenance', 'admin'];
const ALL_ROLES = ['student', ...STAFF_ROLES];
const EMPTY_FORM = { name: '', email: '', password: '', role: 'warden' };

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const loadUsers = async () => {
    try {
      setUsers(await get('/admin/users'));
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load users.');
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const createUser = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await post('/admin/users', form);
      setForm(EMPTY_FORM);
      setSuccess('Staff account created.');
      await loadUsers();
    } catch (err) {
      setError(err.details ? Object.values(err.details).join(' ') : err.message || 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  };

  const updateUser = (id, key, value) => {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, [key]: value } : user)));
  };

  const saveUser = async (event, user) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const updated = await patch(`/admin/users/${user.id}`, { role: user.role, isActive: user.isActive });
      setUsers((current) => current.map((item) => (item.id === user.id ? updated : item)));
      setSuccess(`Updated ${updated.email}.`);
    } catch (err) {
      setError(err.details ? Object.values(err.details).join(' ') : err.message || 'Could not update the account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="registration">
      <h1>Users &amp; roles</h1>
      <p className="intro">Create staff accounts and manage user roles and access.</p>
      {error && <p className="alert" role="alert">{error}</p>}
      {success && <p className="success" role="status">{success}</p>}

      <form className="card" onSubmit={createUser}>
        <h2>Create staff account</h2>
        <label className="field" htmlFor="new-user-name"><span>Full name</span><input id="new-user-name" required maxLength="120" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="field" htmlFor="new-user-email"><span>Email</span><input id="new-user-email" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label className="field" htmlFor="new-user-password"><span>Temporary password</span><input id="new-user-password" type="password" autoComplete="new-password" required minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
        <label className="field" htmlFor="new-user-role">
          <span>Role</span>
          <select id="new-user-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            {STAFF_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </label>
        <button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>

      <section className="card user-list" aria-labelledby="user-list-title">
        <h2 id="user-list-title">All users</h2>
        {users.length === 0 ? <p>No users found.</p> : users.map((user) => (
          <form className="user-row" key={user.id} onSubmit={(event) => saveUser(event, user)}>
            <div className="user-identity"><strong>{user.name}</strong><span>{user.email}</span></div>
            <label className="field" htmlFor={`role-${user.id}`}>
              <span>Role</span>
              <select id={`role-${user.id}`} value={user.role} disabled={user.id === currentUser.id} onChange={(event) => updateUser(user.id, 'role', event.target.value)}>
                {ALL_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
            <label className="active-toggle" htmlFor={`active-${user.id}`}>
              <input id={`active-${user.id}`} type="checkbox" checked={user.isActive} disabled={user.id === currentUser.id} onChange={(event) => updateUser(user.id, 'isActive', event.target.checked)} />
              Active
            </label>
            <button type="submit" disabled={busy}>Save</button>
          </form>
        ))}
      </section>
      <p><Link to="/">Back to dashboard</Link></p>
    </main>
  );
}
