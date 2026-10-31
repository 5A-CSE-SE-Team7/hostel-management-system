import { useCallback, useEffect, useId, useState } from 'react';
import { api } from '../api';
import ComplaintAssignment from '../components/ComplaintAssignment';
import { useAuth } from '../auth';
import { Alert, Badge, DataTable, Field } from '../components/ui';
const empty = { categoryId: '', location: '', description: '', attachmentRef: '' };
export default function Complaints() {
  const { user } = useAuth();
  const [form, setForm] = useState(empty);
  const isStaff = ['warden', 'admin'].includes(user.role);
  const [staff, setStaff] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [details, setDetails] = useState({});
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [pageError, setPageError] = useState('');
  const categoryId = useId(); const descriptionId = useId();
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [cats, complaints, maintenance] = await Promise.all([api('/api/complaint-categories'), api('/api/complaints?limit=100'), isStaff ? api('/api/maintenance-staff') : Promise.resolve([])]);
      setCategories(cats); setStaff(maintenance); setRows(complaints); setHasMore(complaints.length === 100);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [isStaff]);
  useEffect(() => { reload(); }, [reload]);
  async function loadMore() {
    setBusy(true); setPageError('');
    try {
      const more = await api(`/api/complaints?limit=100&before=${rows.at(-1).id}`);
      setRows(current => [...current, ...more]); setHasMore(more.length === 100);
    } catch (e) { setPageError(e.message); }
    finally { setBusy(false); }
  }
  function change(e) { setForm(current => ({ ...current, [e.target.name]: e.target.value })); }
  async function submit(e) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setSubmitError(''); setDetails({}); setSuccess('');
    try {
      const result = await api('/api/complaints', { method: 'POST', body: { ...form, categoryId: Number(form.categoryId) } });
      setSuccess(`Complaint #${result.complaintId} submitted.`); setForm(empty); await reload();
    } catch (e) { setSubmitError(e.message); setDetails(e.details || {}); }
    finally { setBusy(false); }
  }
  const columns = [
    { key: 'id', label: 'Reference' }, { key: 'category', label: 'Category' },
    { key: 'location', label: 'Location' }, { key: 'description', label: 'Description' },
    { key: 'attachmentRef', label: 'Attachment reference' },
    { key: 'status', label: 'Status', render: row => <Badge>{row.status}</Badge> },
    { key: 'priority', label: 'Priority' }, { key: 'assignedToName', label: 'Assigned to' },
    ...(isStaff ? [{ key: 'actions', label: 'Assignment / priority', render: row => <ComplaintAssignment complaint={row} staff={staff} onDone={async message => { setSuccess(message); await reload(); }} /> }] : []),
    { key: 'updatedAt', label: 'Updated' }, { key: 'resolutionDetails', label: 'Resolution' },
  ];
  return <><h1>{user.role === 'student' ? 'My complaints' : 'Complaints'}</h1>
    <Alert>{success}</Alert><Alert error>{error}</Alert>
    {loading ? <Alert>Loading complaints…</Alert> : error ? <button onClick={reload}>Retry complaints</button> : <>
      {user.role === 'student' && <form onSubmit={submit} aria-label="Submit a complaint">
        <h2>Submit a complaint</h2><Alert error>{submitError}</Alert>
        <div className="field"><label htmlFor={categoryId}>Category</label><select id={categoryId} name="categoryId" required value={form.categoryId} onChange={change} aria-invalid={!!details.categoryId} aria-describedby={details.categoryId ? `${categoryId}-error` : undefined}>
          <option value="">Choose a category</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>{details.categoryId && <span id={`${categoryId}-error`} className="error">{details.categoryId}</span>}</div>
        {!categories.length && <Alert>No active categories are available. Contact hostel staff.</Alert>}
        <Field label="Location (block/room)" name="location" required maxLength={120} value={form.location} onChange={change} error={details.location} />
        <div className="field"><label htmlFor={descriptionId}>Description</label><textarea id={descriptionId} name="description" required minLength={5} maxLength={2000} value={form.description} onChange={change} aria-invalid={!!details.description} aria-describedby={details.description ? `${descriptionId}-error` : undefined} />{details.description && <span id={`${descriptionId}-error`} className="error">{details.description}</span>}</div>
        <Field label="Attachment reference (optional; no file upload)" name="attachmentRef" maxLength={300} value={form.attachmentRef} onChange={change} error={details.attachmentRef} />
        <button disabled={busy || !categories.length}>{busy ? 'Submitting…' : 'Submit complaint'}</button>
      </form>}
      <h2>Tracking</h2><DataTable caption="Complaint history" columns={columns} rows={rows} empty="No complaints yet." />
      <Alert error>{pageError}</Alert>{hasMore && <button onClick={loadMore} disabled={busy}>{busy ? 'Loading…' : 'Load older complaints'}</button>}
    </>}
  </>;
}
