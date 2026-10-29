import React from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Badge, Table, money, useLoad } from '../components/ui.jsx';

function StudentHome() {
  const room = useLoad(() => api.get('/me/room'));
  const fees = useLoad(() => api.get('/fees/me'));
  const comps = useLoad(() => api.get('/complaints'));
  const open = (comps.data || []).filter((c) => c.status !== 'resolved').length;
  const cur = room.data?.current;
  return (
    <div className="grid">
      <section className="card"><h3>My room</h3>
        {cur ? <p className="stat">{cur.blockName} · {cur.roomNumber} · Bed {cur.bedLabel}</p> : <p className="muted">No bed allocated yet.</p>}
        <Link to="/my-room">Details</Link></section>
      <section className="card"><h3>Outstanding fees</h3><p className="stat">₹ {money(fees.data?.totals.outstanding)}</p><Link to="/fees">Ledger</Link></section>
      <section className="card"><h3>Open complaints</h3><p className="stat">{open}</p><Link to="/complaints">Track complaints</Link></section>
    </div>
  );
}

function StaffHome({ admin }) {
  const occ = useLoad(() => api.get('/occupancy'));
  const pend = useLoad(() => api.get('/leave?status=pending'));
  const comps = useLoad(() => api.get('/complaints?status=submitted'));
  const vis = useLoad(() => api.get('/visitors?status=pending'));
  return (
    <>
      <div className="grid">
        <section className="card"><h3>Occupancy</h3><p className="stat">{occ.data?.occupied ?? '–'} / {occ.data?.totalBeds ?? '–'}</p><Link to="/allocations">Allocations</Link></section>
        <section className="card"><h3>Unassigned complaints</h3><p className="stat">{comps.data?.length ?? '–'}</p><Link to="/complaints">Review</Link></section>
        <section className="card"><h3>Pending leave/outpass</h3><p className="stat">{pend.data?.length ?? '–'}</p><Link to="/leave">Review</Link></section>
        <section className="card"><h3>Pending visitors</h3><p className="stat">{vis.data?.length ?? '–'}</p><Link to="/visitors">Review</Link></section>
      </div>
      {occ.data && <section className="card"><h3>Occupancy by block</h3>
        <Table caption="Occupancy by block" rows={occ.data.blocks.map((b) => ({ ...b, id: b.blockId }))}
          columns={[{ header: 'Block', key: 'blockName' }, { header: 'Total beds', key: 'totalBeds' }, { header: 'Occupied', key: 'occupied' }, { header: 'Available', key: 'available' }]} /></section>}
      {admin && <p><Link to="/audit">Open audit log</Link> · <Link to="/users">Manage users & roles</Link></p>}
    </>
  );
}

function MaintenanceHome() {
  const { data, error } = useLoad(() => api.get('/complaints'));
  const active = (data || []).filter((c) => c.status !== 'resolved');
  return (
    <section className="card"><h3>My assigned work</h3><Alert>{error}</Alert>
      <Table caption="Assigned complaints" rows={active} empty="No active assignments."
        columns={[{ header: '#', key: 'id' }, { header: 'Category', key: 'category' }, { header: 'Location', key: 'location' },
          { header: 'Priority', render: (c) => <Badge value={c.priority} /> }, { header: 'Status', render: (c) => <Badge value={c.status} /> }]} />
      <Link to="/complaints">Update progress</Link></section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <>
      <h2>Welcome, {user.name}</h2>
      {user.role === 'student' && <StudentHome />}
      {(user.role === 'warden' || user.role === 'admin') && <StaffHome admin={user.role === 'admin'} />}
      {user.role === 'maintenance' && <MaintenanceHome />}
    </>
  );
}
