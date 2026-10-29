import React, { useState } from 'react';
import { api } from '../api.js';
import { Alert, Table, fmtDate, useLoad } from '../components/ui.jsx';

export default function Audit() {
  const [action, setAction] = useState('');
  const { data, error } = useLoad(() => api.get(`/admin/audit?limit=200${action ? `&action=${encodeURIComponent(action)}` : ''}`), [action]);
  const [verify, setVerify] = useState(null);
  return (
    <>
      <h2>Audit log</h2><Alert>{error}</Alert>
      <div className="card">
        <div className="row" style={{ marginTop: 0 }}>
          <div className="field"><label htmlFor="act">Filter by action</label><input id="act" placeholder="e.g. LOGIN, ALLOCATION_CREATE" value={action} onChange={(e) => setAction(e.target.value.toUpperCase())} /></div>
          <button className="secondary" onClick={async () => setVerify(await api.get('/admin/audit/verify'))}>Verify integrity</button>
        </div>
        {verify && <Alert kind={verify.valid ? 'success' : 'error'}>{verify.valid ? `Audit chain intact (${verify.checked} events checked).` : `Tampering detected near event #${verify.brokenAtId ?? 'end of log'}.`}</Alert>}
      </div>
      <Table caption="Audit events" rows={data} empty="No audit events."
        columns={[{ header: 'Time (UTC)', render: (l) => fmtDate(l.createdAt) }, { header: 'User', render: (l) => (l.userId ? `${l.role} #${l.userId}` : '—') }, { header: 'Action', key: 'action' },
          { header: 'Entity', render: (l) => (l.entity ? `${l.entity} ${l.entityId ?? ''}` : '') }, { header: 'Details', key: 'details' }]} />
    </>
  );
}
