import React from 'react';
import { api } from '../api.js';
import { Alert, Badge, Table, useLoad } from '../components/ui.jsx';

export default function MyRoom() {
  const { data, error } = useLoad(() => api.get('/me/room'));
  const c = data?.current;
  return (
    <>
      <h2>My room & allocation</h2><Alert>{error}</Alert>
      <section className="card"><h3>Current allocation</h3>
        {c ? (<dl>
          <dt>Block / room / bed</dt><dd>{c.blockName} · Room {c.roomNumber} · Bed {c.bedLabel}</dd>
          <dt>Status</dt><dd><Badge value={c.status} /></dd>
          <dt>Check-in date</dt><dd>{c.checkInDate || 'Not checked in yet'}</dd>
        </dl>) : <p className="muted">You have no current allocation. Please contact the warden.</p>}
      </section>
      <section className="card"><h3>History</h3>
        <Table caption="Allocation history" rows={data?.history} empty="No previous allocations."
          columns={[{ header: 'Block', key: 'blockName' }, { header: 'Room', key: 'roomNumber' }, { header: 'Bed', key: 'bedLabel' },
            { header: 'Check-in', key: 'checkInDate' }, { header: 'Check-out', key: 'checkOutDate' }, { header: 'Outcome', render: (a) => <Badge value={a.status} /> }]} />
      </section>
    </>
  );
}
