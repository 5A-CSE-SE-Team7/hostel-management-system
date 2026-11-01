import { useEffect, useState } from 'react';
import { api } from '../api';
export default function NotificationCount() {
  const [count, setCount] = useState(null);
  useEffect(() => {
    let active = true;
    async function refresh() {
      try { const result = await api('/api/notifications/unread-count'); if (active) setCount(Number.isSafeInteger(result.count) ? result.count : null); }
      catch (_) { if (active) setCount(null); }
    }
    refresh(); const timer = setInterval(refresh, 60000);
    window.addEventListener('hms:notifications', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('hms:notifications', refresh); };
  }, []);
  return count === null ? null : <span aria-label={`${count} unread notifications`}> ({count})</span>;
}
