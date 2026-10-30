import { useCallback, useEffect, useState } from 'react';

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
  return body;
}

export default function Allocations() {
  const [availableBeds, setAvailableBeds] = useState([]);
  const [occupancy, setOccupancy] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [bedId, setBedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [beds, summary] = await Promise.all([
        api('/api/beds/available'),
        api('/api/occupancy'),
      ]);
      setAvailableBeds(beds);
      setOccupancy(summary);
      setBedId((current) => beds.some((bed) => String(bed.id) === current) ? current : '');
    } catch (err) {
      setError(err.message || 'Could not load allocation data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function submitAllocation(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const allocation = await api('/api/allocations', {
        method: 'POST',
        body: JSON.stringify({ studentId: Number(studentId), bedId: Number(bedId) }),
      });
      setNotice(`Allocation #${allocation.id} created for student ${allocation.studentId}.`);
      setStudentId('');
      await loadData();
    } catch (err) {
      setError(err.message || 'Could not allocate the bed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <header>
        <h1>Bed allocations</h1>
        <p>Assign an active, available bed to an eligible student.</p>
      </header>

      {error && <p role="alert">{error}</p>}
      {notice && <p role="status" aria-live="polite">{notice}</p>}

      <section aria-labelledby="new-allocation-heading">
        <h2 id="new-allocation-heading">Create allocation</h2>
        <form onSubmit={submitAllocation}>
          <label htmlFor="allocation-student-id">Student ID </label>
          <input id="allocation-student-id" type="number" min="1" step="1" required value={studentId}
            onChange={(event) => setStudentId(event.target.value)} />{' '}
          <label htmlFor="allocation-bed">Available bed </label>
          <select id="allocation-bed" required value={bedId} onChange={(event) => setBedId(event.target.value)}>
            <option value="">Choose a bed</option>
            {availableBeds.map((bed) => (
              <option key={bed.id} value={bed.id}>
                {bed.block.name} · Room {bed.room.roomNumber} · Bed {bed.label}
              </option>
            ))}
          </select>{' '}
          <button type="submit" disabled={submitting || loading || !availableBeds.length}>
            {submitting ? 'Allocating…' : 'Allocate bed'}
          </button>
        </form>
        {!loading && !availableBeds.length && <p>No available beds. Add or reactivate inventory first.</p>}
      </section>

      <section aria-labelledby="occupancy-heading">
        <h2 id="occupancy-heading">Occupancy</h2>
        {loading ? <p role="status">Loading occupancy…</p> : occupancy && (
          <>
            <p>
              {occupancy.occupiedBeds} occupied of {occupancy.totalBeds} active beds
              {' '}({occupancy.occupancyPercent}%). {occupancy.availableBeds} available.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Block</th>
                    <th scope="col">Occupied</th>
                    <th scope="col">Available</th>
                    <th scope="col">Total active beds</th>
                  </tr>
                </thead>
                <tbody>
                  {occupancy.blocks.length ? occupancy.blocks.map((block) => (
                    <tr key={block.blockId}>
                      <th scope="row">{block.blockName}</th>
                      <td>{block.occupiedBeds}</td>
                      <td>{block.availableBeds}</td>
                      <td>{block.totalBeds}</td>
                    </tr>
                  )) : <tr><td colSpan="4">No active blocks.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
