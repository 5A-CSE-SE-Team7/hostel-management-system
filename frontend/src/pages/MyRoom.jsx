import { useCallback, useEffect, useState } from 'react';

async function getMyRoom() {
  const response = await fetch('/api/me/room', { credentials: 'include' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
  return body;
}

export default function MyRoom() {
  const [allocation, setAllocation] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRoom = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getMyRoom();
      setAllocation(result.allocation);
      setHistory(result.history || []);
    } catch (err) {
      setError(err.message || 'Could not load your room assignment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRoom(); }, [loadRoom]);

  return (
    <main>
      <header>
        <h1>My room</h1>
        <p>Your current hostel bed assignment.</p>
      </header>

      {error && <p role="alert">{error}</p>}
      {loading ? <p role="status">Loading your assignment…</p> : allocation ? (
        <section aria-labelledby="assignment-heading">
          <h2 id="assignment-heading">Current assignment</h2>
          <dl>
            <dt>Block</dt>
            <dd>{allocation.block.name}</dd>
            <dt>Room</dt>
            <dd>{allocation.room.roomNumber}{allocation.room.floor == null ? '' : ` (floor ${allocation.room.floor})`}</dd>
            <dt>Bed</dt>
            <dd>{allocation.bed.label}</dd>
            <dt>Status</dt>
            <dd>{allocation.status}</dd>
            <dt>Allocated at</dt>
            <dd><time dateTime={allocation.allocatedAt}>{allocation.allocatedAt}</time></dd>
          </dl>
        </section>
      ) : !error ? (
        <p>You don’t have a bed assignment yet. Contact your warden for help.</p>
      ) : null}

      {!loading && !error && (
        <section aria-labelledby="room-history-heading">
          <h2 id="room-history-heading">Room history</h2>
          {history.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Bed</th>
                    <th scope="col">Status</th>
                    <th scope="col">Allocated</th>
                    <th scope="col">Check-in</th>
                    <th scope="col">Check-out</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id}>
                      <th scope="row">{row.block.name} · Room {row.room.roomNumber} · Bed {row.bed.label}</th>
                      <td>{row.status}</td>
                      <td>{row.allocatedAt}</td>
                      <td>{row.checkInDate || '—'}</td>
                      <td>{row.checkOutDate || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p>No room history yet.</p>}
        </section>
      )}
    </main>
  );
}
