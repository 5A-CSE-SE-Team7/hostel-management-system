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
  const [activeAllocations, setActiveAllocations] = useState([]);
  const [allocationHistory, setAllocationHistory] = useState([]);
  const [occupancy, setOccupancy] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [bedId, setBedId] = useState('');
  const [transferBedIds, setTransferBedIds] = useState({});
  const [transitionDates, setTransitionDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transferringId, setTransferringId] = useState(null);
  const [transitioningId, setTransitioningId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [beds, summary, allocations, history] = await Promise.all([
        api('/api/beds/available'),
        api('/api/occupancy'),
        api('/api/allocations'),
        api('/api/allocations/history'),
      ]);
      setAvailableBeds(beds);
      setOccupancy(summary);
      setBedId((current) => beds.some((bed) => String(bed.id) === current) ? current : '');
      setActiveAllocations(allocations);
      setAllocationHistory(history);
      setTransferBedIds((current) => Object.fromEntries(allocations.map((allocation) => {
        const key = String(allocation.id);
        return [key, beds.some((bed) => String(bed.id) === current[key]) ? current[key] : ''];
      })));
      const today = new Date().toISOString().slice(0, 10);
      setTransitionDates((current) => Object.fromEntries(allocations.map((allocation) => {
        const key = String(allocation.id);
        return [key, { checkIn: current[key]?.checkIn || today, checkOut: current[key]?.checkOut || today }];
      })));
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

  async function transferAllocation(allocation) {
    const targetBedId = Number(transferBedIds[String(allocation.id)]);
    if (!targetBedId) return;
    setTransferringId(allocation.id);
    setError('');
    setNotice('');
    try {
      const result = await api(`/api/allocations/${allocation.id}/transfer`, {
        method: 'POST',
        body: JSON.stringify({ targetBedId }),
      });
      const target = availableBeds.find((bed) => bed.id === result.bedId);
      setNotice(`Student ${allocation.studentName} transferred to ${target?.block.name || 'the selected block'}, room ${target?.room.roomNumber || ''}, bed ${target?.label || ''}.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Could not transfer the student. The current allocation was kept.');
    } finally {
      setTransferringId(null);
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

      <section aria-labelledby="active-allocation-heading">
        <h2 id="active-allocation-heading">Current allocations</h2>
        {loading ? <p role="status">Loading current allocations…</p> : activeAllocations.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Current bed</th>
                  <th scope="col">Status</th>
                  <th scope="col">Available target bed</th>
                  <th scope="col">Transfer</th>
                  <th scope="col">Check-in/out date</th>
                  <th scope="col">Check-in/out</th>
                </tr>
              </thead>
              <tbody>
                {activeAllocations.map((allocation) => {
                  const key = String(allocation.id);
                  return (
                    <tr key={allocation.id}>
                      <th scope="row">{allocation.studentName} (#{allocation.studentId})</th>
                      <td>{allocation.blockName} · Room {allocation.roomNumber} · Bed {allocation.bedLabel}</td>
                      <td>{allocation.status}</td>
                      <td>
                        <select id={`transfer-bed-${allocation.id}`} value={transferBedIds[key] || ''}
                          aria-label={`Target bed for ${allocation.studentName}`}
                          onChange={(event) => setTransferBedIds((current) => ({ ...current, [key]: event.target.value }))}>
                          <option value="">Choose a bed</option>
                          {availableBeds.map((bed) => (
                            <option key={bed.id} value={bed.id}>
                              {bed.block.name} · Room {bed.room.roomNumber} · Bed {bed.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button type="button" disabled={!transferBedIds[key] || transferringId !== null || transitioningId !== null}
                          onClick={() => transferAllocation(allocation)}>
                          {transferringId === allocation.id ? 'Transferring…' : 'Transfer'}
                        </button>
                      </td>
                      <td>
                        <input type="date" value={transitionDates[key]?.[allocation.status === 'checked_in' ? 'checkOut' : 'checkIn'] || ''}
                          aria-label={`${allocation.status === 'checked_in' ? 'Check-out' : 'Check-in'} date for ${allocation.studentName}`}
                          onChange={(event) => setTransitionDates((current) => ({
                            ...current,
                            [key]: { ...current[key], [allocation.status === 'checked_in' ? 'checkOut' : 'checkIn']: event.target.value },
                          }))} />
                      </td>
                      <td>
                        <button type="button" disabled={!transitionDates[key]?.[allocation.status === 'checked_in' ? 'checkOut' : 'checkIn']
                          || transitioningId !== null || transferringId !== null}
                          onClick={async () => {
                            const checkedIn = allocation.status === 'checked_in';
                            const action = checkedIn ? 'check-out' : 'check-in';
                            const dateField = checkedIn ? 'checkOutDate' : 'checkInDate';
                            setTransitioningId(allocation.id);
                            setError('');
                            setNotice('');
                            try {
                              await api(`/api/allocations/${allocation.id}/${action}`, {
                                method: 'POST',
                                body: JSON.stringify({ [dateField]: transitionDates[key][checkedIn ? 'checkOut' : 'checkIn'] }),
                              });
                              setNotice(`${allocation.studentName} checked ${checkedIn ? 'out' : 'in'} successfully.`);
                              await loadData();
                            } catch (err) {
                              setError(err.message || `Could not check ${checkedIn ? 'out' : 'in'} the student.`);
                            } finally {
                              setTransitioningId(null);
                            }
                          }}>
                          {transitioningId === allocation.id ? 'Saving…' : allocation.status === 'checked_in' ? 'Check out' : 'Check in'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p>No active allocations.</p>}
      </section>

      <section aria-labelledby="allocation-history-heading">
        <h2 id="allocation-history-heading">Allocation history</h2>
        {loading ? <p role="status">Loading allocation history…</p> : allocationHistory.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Bed</th>
                  <th scope="col">Status</th>
                  <th scope="col">Allocated</th>
                  <th scope="col">Check-in</th>
                  <th scope="col">Check-out</th>
                </tr>
              </thead>
              <tbody>
                {allocationHistory.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{row.studentName} (#{row.studentId})</th>
                    <td>{row.blockName} · Room {row.roomNumber} · Bed {row.bedLabel}</td>
                    <td>{row.status}</td>
                    <td>{row.allocatedAt}</td>
                    <td>{row.checkInDate || '—'}</td>
                    <td>{row.checkOutDate || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>No allocation history yet.</p>}
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
