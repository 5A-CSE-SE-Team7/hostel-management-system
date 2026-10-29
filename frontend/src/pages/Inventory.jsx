import React, { useState } from 'react';
import { api } from '../api.js';
import { Alert, Input, Select, useAction, useLoad } from '../components/ui.jsx';

export default function Inventory() {
  const { data, error, reload } = useLoad(() => api.get('/inventory'));
  const [blk, setBlk] = useState({ name: '' });
  const [room, setRoom] = useState({ blockId: '', roomNumber: '', floor: '' });
  const [bed, setBed] = useState({ roomId: '', label: '' });
  const [st, run] = useAction();

  const rooms = (data || []).flatMap((b) => b.rooms.map((r) => ({ value: r.id, label: `${b.name} / ${r.roomNumber}` })));
  const toggle = (path, id, isActive) => async () => { if (await run(() => api.patch(`/${path}/${id}`, { isActive: !isActive }), 'Updated.')) reload(); };

  return (
    <>
      <h2>Hostel inventory</h2><Alert>{error}</Alert><Alert>{st.error}</Alert><Alert kind="success">{st.ok}</Alert>
      <div className="grid">
        <form className="card" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api.post('/blocks', blk), 'Block added.')) { setBlk({ name: '' }); reload(); } }}>
          <h3>Add block</h3><Input form={blk} setForm={setBlk} name="name" label="Block name" required />
          <div className="row"><button>Add block</button></div></form>
        <form className="card" onSubmit={async (e) => { e.preventDefault(); const body = { blockId: Number(room.blockId), roomNumber: room.roomNumber }; if (room.floor !== '') body.floor = Number(room.floor); if (await run(() => api.post('/rooms', body), 'Room added.')) { setRoom({ ...room, roomNumber: '' }); reload(); } }}>
          <h3>Add room</h3>
          <Select form={room} setForm={setRoom} name="blockId" label="Block" required options={(data || []).filter((b) => b.isActive).map((b) => ({ value: b.id, label: b.name }))} />
          <Input form={room} setForm={setRoom} name="roomNumber" label="Room number" required />
          <Input form={room} setForm={setRoom} name="floor" label="Floor" type="number" />
          <div className="row"><button>Add room</button></div></form>
        <form className="card" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api.post('/beds', { roomId: Number(bed.roomId), label: bed.label }), 'Bed added.')) { setBed({ ...bed, label: '' }); reload(); } }}>
          <h3>Add bed</h3><Select form={bed} setForm={setBed} name="roomId" label="Room" required options={rooms} />
          <Input form={bed} setForm={setBed} name="label" label="Bed label" required />
          <div className="row"><button>Add bed</button></div></form>
      </div>
      <section className="card tree"><h3>Blocks, rooms and beds</h3>
        {!data?.length && <p className="muted">No blocks yet.</p>}
        {(data || []).map((b) => (
          <details key={b.id} open>
            <summary><strong className={b.isActive ? '' : 'muted'}>{b.name}</strong> {!b.isActive && '(inactive)'}{' '}
              <button className="small secondary" onClick={toggle('blocks', b.id, b.isActive)}>{b.isActive ? 'Deactivate' : 'Reactivate'}</button></summary>
            {b.rooms.map((r) => (
              <details key={r.id} open>
                <summary>Room {r.roomNumber}{r.floor != null ? ` (floor ${r.floor})` : ''} {!r.isActive && '(inactive)'}{' '}
                  <button className="small secondary" onClick={toggle('rooms', r.id, r.isActive)}>{r.isActive ? 'Deactivate' : 'Reactivate'}</button></summary>
                <div>{r.beds.map((bd) => (
                  <span key={bd.id} className={`bed ${bd.occupied ? 'occ' : ''} ${bd.isActive ? '' : 'off'}`}>
                    Bed {bd.label}{bd.occupied ? ` · ${bd.occupant.name}` : ''}
                    {!bd.occupied && <button className="small secondary" onClick={toggle('beds', bd.id, bd.isActive)}>{bd.isActive ? 'Deactivate' : 'Reactivate'}</button>}
                  </span>))}</div>
              </details>))}
          </details>))}
      </section>
    </>
  );
}
