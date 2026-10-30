import { useEffect, useId, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { Alert, DataTable, Field } from '../components/ui';
export function money(value) { const n = Number(value); return Number.isFinite(n) ? n.toFixed(2) : 'Unavailable'; }
export function Ledger({ data }) {
  return <><dl>{Object.entries(data.totals).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>₹ {money(value)}</dd></div>)}</dl>
    <DataTable caption="Fee assessments" rows={data.assessments} empty="No assessments recorded." columns={[{ key: 'description', label: 'Description' }, { key: 'dueDate', label: 'Due date' }, { key: 'amount', label: 'Amount', render: row => money(row.amount) }, { key: 'paid', label: 'Paid', render: row => money(row.paid) }, { key: 'outstanding', label: 'Outstanding', render: row => money(row.outstanding) }]} />
    <DataTable caption="Payments received" rows={data.payments} empty="No payments recorded." columns={[{ key: 'paidOn', label: 'Date' }, { key: 'amount', label: 'Amount', render: row => money(row.amount) }, { key: 'reference', label: 'Receipt/reference' }, { key: 'assessmentId', label: 'Assessment', render: row => row.assessmentId || 'General payment' }]} />
  </>;
}
function MutationForm({ kind, studentId, assessments, onDone }) {
  const [form, setForm] = useState({ description: '', amount: '', dueDate: '', paidOn: '', reference: '', assessmentId: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [fields, setFields] = useState({}); const selectId = useId();
  const assessment = kind === 'assessments';
  function change(e) { setForm(old => ({ ...old, [e.target.name]: e.target.value })); }
  async function submit(e) {
    e.preventDefault(); if (busy) return; setBusy(true); setError(''); setFields({});
    const body = { studentId: Number(studentId), amount: Number(form.amount), ...(assessment ? { description: form.description, dueDate: form.dueDate } : { paidOn: form.paidOn, reference: form.reference, ...(form.assessmentId ? { assessmentId: Number(form.assessmentId) } : {}) }) };
    try { await api(`/api/fees/${kind}`, { method: 'POST', body }); setForm(old => ({ ...old, description: '', amount: '', reference: '', assessmentId: '' })); await onDone(); }
    catch (e) { setError(e.message); setFields(e.details || {}); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} aria-label={assessment ? 'Add assessment' : 'Record payment'}><h2>{assessment ? 'Add assessment' : 'Record payment'}</h2><Alert error>{error}</Alert>
    {assessment ? <Field label="Description" name="description" maxLength={200} required value={form.description} onChange={change} error={fields.description} /> : <><label htmlFor={selectId}>Against assessment</label><select id={selectId} name="assessmentId" value={form.assessmentId} onChange={change} aria-invalid={!!fields.assessmentId} aria-describedby={fields.assessmentId ? `${selectId}-error` : undefined}><option value="">General payment</option>{assessments.map(row => <option key={row.id} value={row.id}>#{row.id} {row.description}</option>)}</select>{fields.assessmentId && <span id={`${selectId}-error`} className="error">{fields.assessmentId}</span>}</>}
    <Field label={assessment ? 'Assessment amount (₹)' : 'Payment amount (₹)'} name="amount" type="number" min="0.01" max="10000000" step="0.01" required value={form.amount} onChange={change} error={fields.amount} />
    <Field label={assessment ? 'Due date' : 'Paid on'} name={assessment ? 'dueDate' : 'paidOn'} type="date" required value={assessment ? form.dueDate : form.paidOn} onChange={change} error={assessment ? fields.dueDate : fields.paidOn} />
    {!assessment && <Field label="Receipt/reference" name="reference" maxLength={100} value={form.reference} onChange={change} error={fields.reference} />}
    <button disabled={busy}>{busy ? 'Saving…' : assessment ? 'Record assessment' : 'Record payment'}</button>
  </form>;
}
function StudentFees() {
  const [data, setData] = useState(null); const [error, setError] = useState(''); const [version, setVersion] = useState(0); const [loading, setLoading] = useState(true);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(''); api('/api/fees/me', { signal: controller.signal }).then(setData).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [version]);
  return <><h1>My fees</h1><p>Payments are recorded by the hostel office. Online payments are outside this project.</p><Alert error>{error}</Alert>{loading ? <Alert>Loading ledger…</Alert> : error ? <button onClick={() => setVersion(v => v + 1)}>Retry ledger</button> : data && <Ledger data={data} />}</>;
}
function StaffFees() {
  const [students, setStudents] = useState([]); const [dues, setDues] = useState([]); const [studentId, setStudentId] = useState('');
  const [ledger, setLedger] = useState(null); const [error, setError] = useState(''); const [ledgerError, setLedgerError] = useState(''); const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true); const [ledgerLoading, setLedgerLoading] = useState(false); const [version, setVersion] = useState(0); const [query, setQuery] = useState('');
  const picker = useId();
  async function refreshStaff(q = '') {
    setLoading(true); setError('');
    try { const [people, balances] = await Promise.all([api(`/api/students?search=${encodeURIComponent(q)}&q=${encodeURIComponent(q)}`), api('/api/fees/dues')]); setStudents(people); setDues(balances); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refreshStaff(); }, []);
  useEffect(() => {
    const controller = new AbortController(); setLedger(null); setLedgerError('');
    if (!studentId) { setLedgerLoading(false); return () => controller.abort(); }
    setLedgerLoading(true);
    api(`/api/fees/ledger/${studentId}`, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setLedger(data); }).catch(e => { if (!controller.signal.aborted) setLedgerError(e.message); }).finally(() => { if (!controller.signal.aborted) setLedgerLoading(false); });
    return () => controller.abort();
  }, [studentId, version]);
  async function saved() { setSuccess('Fee record saved.'); setVersion(v => v + 1); await refreshStaff(query); }
  return <><h1>Fee ledger</h1><Alert error>{error || ledgerError}</Alert><Alert>{success}</Alert>
    <form onSubmit={e => { e.preventDefault(); refreshStaff(query); }}><Field label="Search students by name or SRN" value={query} onChange={e => setQuery(e.target.value)} /><button disabled={loading}>Search students</button></form>
    {loading ? <Alert>Loading student balances…</Alert> : error ? <button onClick={() => refreshStaff(query)}>Retry balances</button> : <><DataTable caption="Students with outstanding dues" rowKey="studentId" rows={dues} empty="No outstanding dues." columns={[{ key: 'name', label: 'Student' }, { key: 'srn', label: 'SRN' }, { key: 'assessed', label: 'Assessed', render: row => money(row.assessed) }, { key: 'paid', label: 'Paid', render: row => money(row.paid) }, { key: 'outstanding', label: 'Outstanding', render: row => money(row.outstanding) }]} />
      <label htmlFor={picker}>Student</label><select id={picker} value={studentId} onChange={e => { setStudentId(e.target.value); setSuccess(''); }}><option value="">Choose a student</option>{students.map(person => <option key={person.id} value={person.id}>{person.srn} — {person.name}</option>)}</select></>}
    {ledgerLoading && <Alert>Loading ledger…</Alert>}{ledgerError && <button onClick={() => setVersion(v => v + 1)}>Retry ledger</button>}
    {ledger && !ledgerLoading && !ledgerError && <><Ledger data={ledger} /><MutationForm key={`assessment-${studentId}`} kind="assessments" studentId={studentId} assessments={ledger.assessments} onDone={saved} /><MutationForm key={`payment-${studentId}`} kind="payments" studentId={studentId} assessments={ledger.assessments} onDone={saved} /></>}
  </>;
}
export default function Fees() {
  const { user } = useAuth();
  if (user.role === 'student') return <StudentFees />;
  if (['warden', 'admin'].includes(user.role)) return <StaffFees />;
  return <><h1>Access denied</h1><Alert error>You do not have access to fee records.</Alert></>;
}
