import React, { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Input, Select, Table, money, useAction, useLoad } from '../components/ui.jsx';

function LedgerView({ ledger }) {
  if (!ledger) return null;
  const t = ledger.totals;
  return (
    <>
      <div className="grid">
        <div className="card"><h3>Assessed</h3><p className="stat">₹ {money(t.assessed)}</p></div>
        <div className="card"><h3>Paid</h3><p className="stat">₹ {money(t.paid)}</p></div>
        <div className="card"><h3>Outstanding</h3><p className="stat">₹ {money(t.outstanding)}</p></div>
      </div>
      <section className="card"><h3>Assessments</h3>
        <Table caption="Fee assessments" rows={ledger.assessments} empty="No fee assessments."
          columns={[{ header: 'ID', key: 'id' }, { header: 'Description', key: 'description' }, { header: 'Due date', key: 'dueDate' },
            { header: 'Amount', render: (a) => money(a.amount) }, { header: 'Outstanding', render: (a) => money(a.outstanding) }]} /></section>
      <section className="card"><h3>Payments received</h3>
        <Table caption="Fee payments" rows={ledger.payments} empty="No payments recorded."
          columns={[{ header: 'Date', key: 'paidOn' }, { header: 'Amount', render: (p) => money(p.amount) }, { header: 'Assessment', render: (p) => p.assessmentId || 'General' }, { header: 'Reference', key: 'reference' }]} /></section>
    </>
  );
}

function StudentFees() {
  const { data, error } = useLoad(() => api.get('/fees/me'));
  return (<><h2>My fees</h2><p className="muted">Payments are recorded by the hostel office; online payment is out of scope.</p><Alert>{error}</Alert><LedgerView ledger={data} /></>);
}

function StaffFees() {
  const students = useLoad(() => api.get('/students'));
  const dues = useLoad(() => api.get('/fees/dues'));
  const [sid, setSid] = useState('');
  const ledger = useLoad(async () => (sid ? api.get(`/fees/ledger/${sid}`) : null), [sid]);
  const [a, setA] = useState({ description: '', amount: '', dueDate: '' });
  const [p, setP] = useState({ assessmentId: '', amount: '', paidOn: new Date().toISOString().slice(0, 10), reference: '' });
  const [sa, runA] = useAction(); const [sp, runP] = useAction();
  const refresh = () => { ledger.reload(); dues.reload(); };

  const addAssessment = async (e) => {
    e.preventDefault();
    if (await runA(() => api.post('/fees/assessments', { studentId: Number(sid), description: a.description, amount: Number(a.amount), dueDate: a.dueDate }), 'Assessment recorded.')) { setA({ description: '', amount: '', dueDate: '' }); refresh(); }
  };
  const addPayment = async (e) => {
    e.preventDefault();
    const body = { studentId: Number(sid), amount: Number(p.amount), paidOn: p.paidOn };
    if (p.assessmentId) body.assessmentId = Number(p.assessmentId);
    if (p.reference) body.reference = p.reference;
    if (await runP(() => api.post('/fees/payments', body), 'Payment recorded.')) { setP({ ...p, amount: '', reference: '', assessmentId: '' }); refresh(); }
  };

  return (
    <>
      <h2>Fee ledger</h2>
      <section className="card"><h3>Students with dues</h3>
        <Table caption="Outstanding dues" rows={(dues.data || []).map((d) => ({ ...d, id: d.studentId }))} empty="No outstanding dues."
          columns={[{ header: 'SRN', key: 'srn' }, { header: 'Name', key: 'name' }, { header: 'Assessed', render: (d) => money(d.assessed) }, { header: 'Paid', render: (d) => money(d.paid) },
            { header: 'Outstanding', render: (d) => money(d.outstanding) }, { header: '', render: (d) => <button className="small secondary" onClick={() => setSid(String(d.studentId))}>Open</button> }]} /></section>
      <div className="card"><Select form={{ sid }} setForm={(f) => setSid(f.sid)} name="sid" label="Student" options={(students.data || []).map((s) => ({ value: s.id, label: `${s.srn} – ${s.name}` }))} /></div>
      {sid && (<>
        <div className="grid">
          <form className="card" onSubmit={addAssessment} noValidate><h3>Add assessment</h3><Alert>{sa.error}</Alert><Alert kind="success">{sa.ok}</Alert>
            <Input form={a} setForm={setA} name="description" label="Description" required errors={sa.fieldErrors} />
            <Input form={a} setForm={setA} name="amount" label="Amount (₹)" type="number" step="0.01" min="0.01" required errors={sa.fieldErrors} />
            <Input form={a} setForm={setA} name="dueDate" label="Due date" type="date" required errors={sa.fieldErrors} />
            <div className="row"><button disabled={sa.busy}>Record assessment</button></div></form>
          <form className="card" onSubmit={addPayment} noValidate><h3>Record payment</h3><Alert>{sp.error}</Alert><Alert kind="success">{sp.ok}</Alert>
            <Select form={p} setForm={setP} name="assessmentId" label="Against assessment" placeholder="General payment" options={(ledger.data?.assessments || []).map((x) => ({ value: x.id, label: `#${x.id} ${x.description}` }))} />
            <Input form={p} setForm={setP} name="amount" label="Amount (₹)" type="number" step="0.01" min="0.01" required errors={sp.fieldErrors} />
            <Input form={p} setForm={setP} name="paidOn" label="Paid on" type="date" required errors={sp.fieldErrors} />
            <Input form={p} setForm={setP} name="reference" label="Receipt / reference" errors={sp.fieldErrors} />
            <div className="row"><button disabled={sp.busy}>Record payment</button></div></form>
        </div>
        <LedgerView ledger={ledger.data} />
      </>)}
    </>
  );
}

export default function Fees() { return useAuth().user.role === 'student' ? <StudentFees /> : <StaffFees />; }
