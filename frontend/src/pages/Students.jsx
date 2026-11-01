import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, put } from '../api.js';

const EDITABLE_FIELDS = [
  ['name', 'Full name', 'text'],
  ['contact', 'Contact number', 'tel'],
  ['department', 'Department', 'text'],
  ['yearOfStudy', 'Year of study', 'number'],
  ['guardianName', 'Guardian name', 'text'],
  ['guardianContact', 'Guardian contact', 'tel'],
  ['address', 'Home address', 'text'],
];

export default function Students() {
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const search = async (term = '') => {
    setError('');
    try {
      setStudents(await get(`/students?search=${encodeURIComponent(term)}`));
      setSelected(null);
    } catch (err) {
      setError(err.message || 'Could not load students.');
    }
  };

  useEffect(() => { search(); }, []);

  const selectStudent = async (student) => {
    setError('');
    setSuccess('');
    try {
      const details = await get(`/students/${student.id}`);
      setSelected(details);
      setForm(details);
    } catch (err) {
      setError(err.message || 'Could not load this student.');
    }
  };

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const saved = await put(`/students/${selected.id}`, form);
      setSelected(saved);
      setForm(saved);
      setSuccess('Student profile updated.');
      await search(query);
      setSelected(saved);
      setForm(saved);
    } catch (err) {
      setError(err.details ? Object.values(err.details).join(' ') : err.message || 'Could not update this student.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="registration">
      <h1>Students</h1>
      <p className="intro">Search by name, SRN, or email. SRN, email, and role cannot be changed here.</p>
      <form className="card" onSubmit={(event) => { event.preventDefault(); search(query); }}>
        {error && <p className="alert" role="alert">{error}</p>}
        <label className="field" htmlFor="student-search">
          <span>Search students</span>
          <input id="student-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, SRN, or email" />
        </label>
        <button type="submit">Search</button>
        {students.length === 0 ? <p>No students found.</p> : (
          <ul className="student-results">
            {students.map((student) => (
              <li key={student.id}>
                <button type="button" className="student-result" onClick={() => selectStudent(student)}>
                  {student.name} — {student.srn} ({student.email})
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {selected && (
        <form className="card student-editor" onSubmit={submit}>
          <h2>Edit {selected.name}</h2>
          {success && <p className="success" role="status">{success}</p>}
          <label className="field" htmlFor="student-srn"><span>SRN</span><input id="student-srn" value={selected.srn} readOnly /></label>
          <label className="field" htmlFor="student-email"><span>Email</span><input id="student-email" value={selected.email} readOnly /></label>
          {EDITABLE_FIELDS.map(([name, label, type]) => (
            <label className="field" htmlFor={`student-${name}`} key={name}>
              <span>{label}</span>
              <input id={`student-${name}`} name={name} type={type} value={form[name] ?? ''} onChange={update} min={type === 'number' ? 1 : undefined} max={type === 'number' ? 8 : undefined} />
            </label>
          ))}
          <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save student'}</button>
        </form>
      )}
      <p><Link to="/">Back to dashboard</Link></p>
    </main>
  );
}
