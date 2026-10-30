import { useState } from 'react';
import { api } from '../api';
import { Alert, Field } from './ui';
export default function ComplaintProgress({ complaint, onDone }) {
  const [resolutionDetails, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  async function update(status) {
    if (busy) return;
    setBusy(true); setError(''); setFields({});
    try {
      await api(`/api/complaints/${complaint.id}/status`, { method: 'PATCH', body: { status, ...(status === 'resolved' ? { resolutionDetails } : {}) } });
      await onDone(`Complaint #${complaint.id} ${status === 'resolved' ? 'resolved' : 'started'}.`);
    } catch (e) { setError(e.message); setFields(e.details || {}); }
    finally { setBusy(false); }
  }
  return <section aria-label={`Progress for complaint ${complaint.id}`}><Alert error>{error}</Alert>
    {complaint.status === 'assigned' && <button disabled={busy} onClick={() => update('in_progress')}>Start work</button>}
    {complaint.status === 'in_progress' && <><Field label={`Resolution details for complaint ${complaint.id}`} maxLength={2000} value={resolutionDetails} onChange={e => setDetails(e.target.value)} error={fields.resolutionDetails} /><button disabled={busy || !resolutionDetails.trim()} onClick={() => update('resolved')}>Mark resolved</button></>}
    {complaint.status === 'submitted' && <span>Awaiting assignment</span>}
    {complaint.status === 'resolved' && <span>Resolved: {complaint.resolutionDetails}</span>}
  </section>;
}
