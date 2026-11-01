import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Alert, DataTable } from '../components/ui';
export default function Notifications() {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [hasMore, setHasMore] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { const data = await api('/api/notifications'); setRows(data); setHasMore(data.length === 100); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  async function read(id) {
    setBusy(true); setError('');
    try {
      await api(id ? `/api/notifications/${id}/read` : '/api/notifications/read-all', { method: 'POST' });
      await refresh(); window.dispatchEvent(new Event('hms:notifications'));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function more() {
    setBusy(true); setError('');
    try { const data = await api(`/api/notifications?before=${rows.at(-1).id}`); setRows(old => [...old, ...data]); setHasMore(data.length === 100); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const columns = [{ key: 'message', label: 'Message' }, { key: 'createdAt', label: 'Received' }, { key: 'isRead', label: 'Read status', render: row => row.isRead ? 'Read' : <button disabled={busy} onClick={() => read(row.id)}>Mark notification {row.id} read</button> }];
  return <><h1>Notifications</h1><Alert error>{error}</Alert>{loading ? <Alert>Loading notifications…</Alert> : <><button disabled={busy || !rows.some(row => !row.isRead)} onClick={() => read()}>Mark all read</button><DataTable caption="Your notifications" columns={columns} rows={rows} empty="No notifications yet." />{hasMore && <button disabled={busy} onClick={more}>Load older notifications</button>}</>}<button disabled={busy || loading} onClick={refresh}>Refresh notifications</button></>;
}
