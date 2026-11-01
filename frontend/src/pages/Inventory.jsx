import { useCallback, useEffect, useMemo, useState } from 'react';

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

function FormField({ id, label, ...props }) {
  return (
    <label htmlFor={id}>
      {label}{' '}
      <input id={id} name={id} {...props} />
    </label>
  );
}

export default function Inventory() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [edit, setEdit] = useState(null);
  const [blockName, setBlockName] = useState('');
  const [roomBlockId, setRoomBlockId] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [bedRoomId, setBedRoomId] = useState('');
  const [bedLabel, setBedLabel] = useState('');

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setBlocks(await api('/api/inventory'));
    } catch (err) {
      setError(err.message || 'Could not load inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  const activeBlocks = useMemo(() => blocks.filter((block) => block.isActive), [blocks]);
  const activeRooms = useMemo(
    () => blocks.filter((block) => block.isActive)
      .flatMap((block) => block.rooms.filter((room) => room.isActive)
        .map((room) => ({ ...room, blockName: block.name }))),
    [blocks]
  );

  async function createRecord(path, payload, successMessage) {
    setError('');
    setNotice('');
    try {
      await api(path, { method: 'POST', body: JSON.stringify(payload) });
      setNotice(successMessage);
      await loadInventory();
      return true;
    } catch (err) {
      setError(err.message || 'Could not save inventory.');
      return false;
    }
  }

  async function submitBlock(event) {
    event.preventDefault();
    if (await createRecord('/api/blocks', { name: blockName }, 'Block created.')) setBlockName('');
  }

  async function submitRoom(event) {
    event.preventDefault();
    if (await createRecord('/api/rooms', {
      blockId: Number(roomBlockId), roomNumber, ...(floor === '' ? {} : { floor: Number(floor) }),
    }, 'Room created.')) {
      setRoomNumber('');
      setFloor('');
    }
  }

  async function submitBed(event) {
    event.preventDefault();
    if (await createRecord('/api/beds', { roomId: Number(bedRoomId), label: bedLabel }, 'Bed created.')) setBedLabel('');
  }

  function startEdit(kind, record) {
    setError('');
    setNotice('');
    setEdit({ kind, id: record.id, value: kind === 'block' ? record.name
      : kind === 'room' ? record.roomNumber : record.label, floor: record.floor ?? '' });
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!edit) return;
    const path = edit.kind === 'block' ? `/api/blocks/${edit.id}`
      : edit.kind === 'room' ? `/api/rooms/${edit.id}` : `/api/beds/${edit.id}`;
    const payload = edit.kind === 'block' ? { name: edit.value }
      : edit.kind === 'room' ? { roomNumber: edit.value, ...(edit.floor === '' ? {} : { floor: Number(edit.floor) }) }
        : { label: edit.value };
    setError('');
    setNotice('');
    try {
      await api(path, { method: 'PATCH', body: JSON.stringify(payload) });
      setEdit(null);
      setNotice('Inventory updated.');
      await loadInventory();
    } catch (err) {
      setError(err.message || 'Could not update inventory.');
    }
  }

  async function toggleActive(kind, record) {
    const path = kind === 'block' ? `/api/blocks/${record.id}`
      : kind === 'room' ? `/api/rooms/${record.id}` : `/api/beds/${record.id}`;
    setError('');
    setNotice('');
    try {
      await api(path, { method: 'PATCH', body: JSON.stringify({ isActive: !record.isActive }) });
      setNotice(record.isActive ? 'Inventory deactivated.' : 'Inventory reactivated.');
      await loadInventory();
    } catch (err) {
      setError(err.message || 'Could not change inventory status.');
    }
  }

  return (
    <main>
      <header>
        <h1>Hostel inventory</h1>
        <p>Create and maintain blocks, rooms, and beds. Occupied beds are marked in the inventory tree.</p>
      </header>

      {error && <p role="alert">{error}</p>}
      {notice && <p role="status" aria-live="polite">{notice}</p>}

      <section aria-labelledby="create-inventory-heading">
        <h2 id="create-inventory-heading">Add inventory</h2>
        <form onSubmit={submitBlock}>
          <h3>Block</h3>
          <FormField id="block-name" label="Block name" value={blockName} maxLength={60} required
            onChange={(event) => setBlockName(event.target.value)} />{' '}
          <button type="submit">Add block</button>
        </form>

        <form onSubmit={submitRoom}>
          <h3>Room</h3>
          <label htmlFor="room-block">Block </label>
          <select id="room-block" value={roomBlockId} required onChange={(event) => setRoomBlockId(event.target.value)}>
            <option value="">Choose a block</option>
            {activeBlocks.map((block) => <option key={block.id} value={block.id}>{block.name}</option>)}
          </select>{' '}
          <FormField id="room-number" label="Room number" value={roomNumber} maxLength={20} required
            onChange={(event) => setRoomNumber(event.target.value)} />{' '}
          <FormField id="room-floor" label="Floor (optional)" type="number" value={floor}
            onChange={(event) => setFloor(event.target.value)} />{' '}
          <button type="submit" disabled={!activeBlocks.length}>Add room</button>
        </form>

        <form onSubmit={submitBed}>
          <h3>Bed</h3>
          <label htmlFor="bed-room">Room </label>
          <select id="bed-room" value={bedRoomId} required onChange={(event) => setBedRoomId(event.target.value)}>
            <option value="">Choose a room</option>
            {activeRooms.map((room) => <option key={room.id} value={room.id}>{room.blockName} · {room.roomNumber}</option>)}
          </select>{' '}
          <FormField id="bed-label" label="Bed label" value={bedLabel} maxLength={20} required
            onChange={(event) => setBedLabel(event.target.value)} />{' '}
          <button type="submit" disabled={!activeRooms.length}>Add bed</button>
        </form>
      </section>

      {edit && (
        <section aria-labelledby="edit-inventory-heading">
          <h2 id="edit-inventory-heading">Edit {edit.kind}</h2>
          <form onSubmit={saveEdit}>
            <FormField id="edit-value" label={edit.kind === 'block' ? 'Block name' : edit.kind === 'room' ? 'Room number' : 'Bed label'}
              value={edit.value} maxLength={edit.kind === 'block' ? 60 : 20} required
              onChange={(event) => setEdit((current) => ({ ...current, value: event.target.value }))} />{' '}
            {edit.kind === 'room' && <>
              <FormField id="edit-floor" label="Floor (optional)" type="number" value={edit.floor}
                onChange={(event) => setEdit((current) => ({ ...current, floor: event.target.value }))} />{' '}
            </>}
            <button type="submit">Save</button>{' '}
            <button type="button" onClick={() => setEdit(null)}>Cancel</button>
          </form>
        </section>
      )}

      <section aria-labelledby="inventory-tree-heading">
        <h2 id="inventory-tree-heading">Inventory tree</h2>
        {loading ? <p role="status">Loading inventory…</p> : blocks.length ? (
          blocks.map((block) => (
            <details key={block.id}>
              <summary>
                {block.name} · {block.isActive ? 'Active' : 'Inactive'}
              </summary>
              <p>
                <button type="button" onClick={() => startEdit('block', block)}>Edit block</button>{' '}
                <button type="button" onClick={() => toggleActive('block', block)}>
                  {block.isActive ? 'Deactivate block' : 'Reactivate block'}
                </button>
              </p>
              {block.rooms.length ? block.rooms.map((room) => (
                <details key={room.id} style={{ marginInlineStart: '1rem' }}>
                  <summary>
                    Room {room.roomNumber}{room.floor == null ? '' : ` · Floor ${room.floor}`} · {room.isActive ? 'Active' : 'Inactive'}
                  </summary>
                  <p>
                    <button type="button" onClick={() => startEdit('room', room)}>Edit room</button>{' '}
                    <button type="button" onClick={() => toggleActive('room', room)}>
                      {room.isActive ? 'Deactivate room' : 'Reactivate room'}
                    </button>
                  </p>
                  {room.beds.length ? room.beds.map((bed) => (
                    <p key={bed.id} style={{ marginInlineStart: '2rem' }}>
                      Bed {bed.label} · {bed.occupied ? 'Occupied' : 'Available'} · {bed.isActive ? 'Active' : 'Inactive'}{' '}
                      <button type="button" onClick={() => startEdit('bed', bed)}>Edit bed</button>{' '}
                      <button type="button" onClick={() => toggleActive('bed', bed)}>
                        {bed.isActive ? 'Deactivate bed' : 'Reactivate bed'}
                      </button>
                    </p>
                  )) : <p style={{ marginInlineStart: '2rem' }}>No beds in this room.</p>}
                </details>
              )) : <p style={{ marginInlineStart: '1rem' }}>No rooms in this block.</p>}
            </details>
          ))
        ) : <p>No blocks yet. Add a block to start building the inventory.</p>}
      </section>
    </main>
  );
}
