import React, { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { api } from './api.js';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Notifications from './pages/Notifications.jsx';
import MyRoom from './pages/MyRoom.jsx';
import Complaints from './pages/Complaints.jsx';
import Fees from './pages/Fees.jsx';
import Visitors from './pages/Visitors.jsx';
import Leave from './pages/Leave.jsx';
import Inventory from './pages/Inventory.jsx';
import Allocations from './pages/Allocations.jsx';
import Students from './pages/Students.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';
import Audit from './pages/Audit.jsx';

// Role-specific navigation (SRS 3.1). Server-side RBAC is the real gate; this only shapes the UI.
const NAV = [
  { to: '/', label: 'Dashboard', roles: ['student', 'warden', 'maintenance', 'admin'], el: <Dashboard /> },
  { to: '/my-room', label: 'My room', roles: ['student'], el: <MyRoom /> },
  { to: '/complaints', label: 'Complaints', roles: ['student', 'warden', 'admin', 'maintenance'], el: <Complaints /> },
  { to: '/fees', label: 'Fees', roles: ['student', 'warden', 'admin'], el: <Fees /> },
  { to: '/visitors', label: 'Visitors', roles: ['student', 'warden', 'admin'], el: <Visitors /> },
  { to: '/leave', label: 'Leave / outpass', roles: ['student', 'warden', 'admin'], el: <Leave /> },
  { to: '/inventory', label: 'Hostel inventory', roles: ['warden', 'admin'], el: <Inventory /> },
  { to: '/allocations', label: 'Allocations', roles: ['warden', 'admin'], el: <Allocations /> },
  { to: '/students', label: 'Students', roles: ['warden', 'admin'], el: <Students /> },
  { to: '/reports', label: 'Reports', roles: ['warden', 'admin'], el: <Reports /> },
  { to: '/users', label: 'Users & roles', roles: ['admin'], el: <Users /> },
  { to: '/audit', label: 'Audit log', roles: ['admin'], el: <Audit /> },
  { to: '/notifications', label: 'Notifications', roles: ['student', 'warden', 'maintenance', 'admin'], el: <Notifications /> },
  { to: '/profile', label: 'Profile', roles: ['student', 'warden', 'maintenance', 'admin'], el: <Profile /> },
];

function Shell({ user }) {
  const { logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const loc = useLocation();
  useEffect(() => { api.get('/notifications/unread-count').then((r) => setUnread(r.count)).catch(() => {}); }, [loc.pathname]);
  const items = NAV.filter((n) => n.roles.includes(user.role));
  return (
    <div className="layout">
      <a className="skip-link" href="#main">Skip to content</a>
      <aside className="sidebar">
        <h1>Hostel Management</h1>
        <nav aria-label="Main">
          <ul>
            {items.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
                  {n.label}{n.to === '/notifications' && unread > 0 ? ` (${unread})` : ''}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="who">
          <div>{user.name}</div>
          <div style={{ textTransform: 'capitalize' }}>{user.role}</div>
          <button className="secondary small" onClick={logout} style={{ marginTop: '.5rem' }}>Sign out</button>
        </div>
      </aside>
      <main id="main" tabIndex={-1}>
        <Routes>
          {items.map((n) => <Route key={n.to} path={n.to} element={n.el} />)}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  if (user === undefined) return <p className="auth" role="status">Loading…</p>;
  if (!user) {
    return (
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }
  return <Shell user={user} />;
}
