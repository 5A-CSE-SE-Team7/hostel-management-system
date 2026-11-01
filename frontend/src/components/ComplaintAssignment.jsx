import { useId, useState } from 'react';
import { api } from '../api';
import { Alert } from './ui';
export default function ComplaintAssignment({ complaint, staff, onDone }) {
  const [assignedTo, setAssignedTo] = useState(String(complaint.assignedTo || ''));
  const [priority, setPriority] = useState(complaint.priority);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState({});
  const id = useId();
  async function save(assign) {
    if (busy) return;
    setBusy(true); setError(''); setDetails({});
    try {
      await api(`/api/complaints/${complaint.id}/${assign ? 'assign' : 'priority'}`, {
        method: assign ? 'POST' : 'PATCH', body: assign ? { assignedTo: Number(assignedTo), priority } : { priority },
      });
      await onDone(`Complaint #${complaint.id} ${assign ? 'assigned' : 'priority updated'}.`);
    } catch (e) { setError(e.message); setDetails(e.details || {}); }
    finally { setBusy(false); }
  }
  return <section aria-label={`Assignment for complaint ${complaint.id}`}>
    <Alert error>{error}</Alert>
    {complaint.status !== 'resolved' && <><label htmlFor={`${id}-assignee`}>Assignee for complaint {complaint.id}</label><select id={`${id}-assignee`} value={assignedTo} onChange={e => setAssignedTo(e.target.value)} aria-invalid={!!details.assignedTo} aria-describedby={details.assignedTo ? `${id}-assignee-error` : undefined}>
      <option value="">Choose maintenance staff</option>{staff.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
    </select>{details.assignedTo && <span id={`${id}-assignee-error`} className="error">{details.assignedTo}</span>}</>}
    <label htmlFor={`${id}-priority`}>Priority for complaint {complaint.id}</label><select id={`${id}-priority`} value={priority} onChange={e => setPriority(e.target.value)} aria-invalid={!!details.priority} aria-describedby={details.priority ? `${id}-priority-error` : undefined}>
      {['low', 'medium', 'high', 'urgent'].map(value => <option key={value}>{value}</option>)}
    </select>{details.priority && <span id={`${id}-priority-error`} className="error">{details.priority}</span>}
    {complaint.status !== 'resolved' && <button disabled={busy || !assignedTo} onClick={() => save(true)}>Assign</button>}
    <button disabled={busy} onClick={() => save(false)}>Update priority</button>
  </section>;
}
