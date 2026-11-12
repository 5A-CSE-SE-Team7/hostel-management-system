import { useEffect, useId, useState } from 'react';
import { api } from '../api';

export default function AllocationStudentSelect({ value, onChange, disabled, refreshKey }) {
  const id = useId();
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true); setError(''); setStudents([]); onChange('');
    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams({ search, eligibleForAllocation: 'true' });
        const rows = await api(`/api/students?${query}`, { signal: controller.signal });
        if (active) setStudents(rows);
      } catch (err) {
        if (active) setError(err.message || 'Could not load eligible students. Please retry.');
      } finally { if (active) setLoading(false); }
    }, 250);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [search, refreshKey, retry, onChange]);

  return <div>
    <label htmlFor={`${id}-search`}>Search students</label>{' '}
    <input id={`${id}-search`} type="search" value={search} maxLength={100}
      disabled={disabled} aria-describedby={`${id}-help`}
      onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }}
      onChange={event => { setSearch(event.target.value); onChange(''); setStudents([]); }} />
    <p id={`${id}-help`}>Search by name, SRN or email. Only active students without a current allocation are listed.</p>
    <label htmlFor={`${id}-student`}>Student</label>{' '}
    <select id={`${id}-student`} required value={value} disabled={disabled || loading || !!error}
      aria-describedby={`${id}-help ${id}-status`} onChange={event => onChange(event.target.value)}>
      <option value="">Choose a student</option>
      {students.map(student => <option key={student.id} value={String(student.id)}>
        {student.name} — {student.srn} ({student.email})
      </option>)}
    </select>
    <p id={`${id}-status`} role="status">{loading ? 'Loading eligible students…'
      : error ? '' : students.length ? `${students.length} matching student(s). Refine the search if needed.`
        : 'No eligible students match this search.'}</p>
    {error && <><p role="alert">{error}</p><button type="button" disabled={disabled}
      onClick={() => setRetry(current => current + 1)}>Retry student search</button></>}
  </div>;
}
