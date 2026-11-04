import { useEffect, useState } from 'react';
import { api } from '../api';
import { Alert } from '../components/ui';
export default function Notifications() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function refresh() {
    setLoading(true); setError('');
    try { setRows(await api('/api/notifications')); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);
  return <><h1>Notifications</h1><button onClick={refresh} disabled={loading}>Refresh notifications</button><Alert error>{error}</Alert>{loading ? <Alert>Loading notifications…</Alert> : rows.length ? <ul>{rows.map(row => <li key={row.id}><p>{row.message}</p><time>{row.createdAt}</time></li>)}</ul> : <Alert>No notifications yet.</Alert>}</>;
}
