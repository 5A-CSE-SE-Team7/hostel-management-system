import React from 'react';
import { api } from '../api.js';
import { Alert, Table, fmtDate, useLoad } from '../components/ui.jsx';

export default function Notifications() {
  const { data, error, reload } = useLoad(() => api.get('/notifications'));
  const readAll = async () => { await api.post('/notifications/read-all'); reload(); };
  return (
    <>
      <h2>Notifications</h2><Alert>{error}</Alert>
      <div className="row"><button className="secondary" onClick={readAll}>Mark all as read</button></div>
      <Table caption="Notifications" rows={data} empty="No notifications yet."
        columns={[{ header: 'When', render: (n) => fmtDate(n.createdAt) },
          { header: 'Message', render: (n) => (n.isRead ? n.message : <strong>{n.message}</strong>) },
          { header: 'Status', render: (n) => (n.isRead ? 'Read' : 'New') }]} />
    </>
  );
}
