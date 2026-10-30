import { useState } from 'react';
import Visitors from './pages/Visitors';
import Leave from './pages/Leave';
import Complaints from './pages/Complaints';
import Dashboard from './pages/Dashboard';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { Alert, Badge, Field } from './components/ui';
export const navigation = [
  { path: '/visitors', label: 'Visitors', roles: ['student','warden','admin'] },
  { path: '/leave', label: 'Leave & outpass', roles: ['student','warden','admin'] },
  { path: '/', label: 'Dashboard', roles: ['student', 'warden', 'maintenance', 'admin'] },
  { path: '/complaints', label: 'Complaints', roles: ['student', 'warden', 'maintenance', 'admin'] },
  { path: '/notifications', label: 'Notifications', roles: ['student', 'warden', 'maintenance', 'admin'] },
  { path: '/fees', label: 'Fees', roles: ['student', 'warden', 'admin'] },
];
function Login({ registrationEnabled = false }) {
  const { login, user, error: serviceError } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    const data = new FormData(e.currentTarget);
    try { await login(data.get('email'), data.get('password')); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <><h1>Sign in</h1><Alert error>{serviceError || error}</Alert><form onSubmit={submit}><Field label="Institutional email" name="email" type="email" autoComplete="username" required /><Field label="Password" name="password" type="password" autoComplete="current-password" required /><button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form>{registrationEnabled && <NavLink to="/register">Create an account</NavLink>}</>;
}
function Protected({ roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <><h1>Access denied</h1><Alert error>You do not have permission to view this page.</Alert></>;
  return <Outlet />;
}
function Pending({ title }) { return <><h1>{title}</h1><Alert>This feature is awaiting its module integration.</Alert></>; }
const accountRoutes = [
  { key: 'Allocations', path: '/allocations', label: 'Allocations', roles: ['warden', 'admin'] },
  { key: 'MyRoom', path: '/my-room', label: 'My room', roles: ['student'] },
  { key: 'Inventory', path: '/inventory', label: 'Inventory', roles: ['warden', 'admin'] },
  { key: 'Audit', path: '/audit', label: 'Audit log', roles: ['admin'] },
  { key: 'Profile', path: '/profile', label: 'My profile', roles: ['student', 'warden', 'maintenance', 'admin'] },
  { key: 'Students', path: '/students', label: 'Manage students', roles: ['warden', 'admin'] },
  { key: 'Users', path: '/users', label: 'Users & roles', roles: ['admin'] },
];
export default function App({ registrationPage = null, loginPage = null, accountPages = {} }) {
  const { user, loading, error, logout } = useAuth();
  const [logoutError, setLogoutError] = useState('');
  const { pathname } = useLocation();
  const extensions = accountRoutes.filter(route => accountPages[route.key]);
  // Teammate pages own their main landmark; the shared shell uses a container.
  const Content = (!user && (registrationPage || loginPage)) || extensions.some(route => route.path === pathname) ? 'div' : 'main';
  return <><a className="skip" href="#content">Skip to content</a><header><strong>Hostel Management System</strong>{user && <div><Badge>{user.role}</Badge><button onClick={async () => { try { await logout(); } catch (e) { setLogoutError(e.message); } }}>Sign out</button></div>}</header><div className="layout">{user && <nav aria-label="Main navigation">{[...navigation, ...extensions].filter(n => n.roles.includes(user.role)).map(n => <NavLink key={n.path} to={n.path} end={n.path === '/'}>{n.label}</NavLink>)}</nav>}<Content id="content" tabIndex="-1"><Alert error>{logoutError}</Alert>{loading ? <Alert>Checking your session…</Alert> : <Routes><Route path="/login" element={user ? <Navigate to="/" replace /> : loginPage || <Login registrationEnabled={!!registrationPage} />} />{registrationPage && <Route path="/register" element={user ? <Navigate to="/" replace /> : registrationPage} />}<Route element={<Protected />}>{extensions.map(route => <Route key={route.key} element={<Protected roles={route.roles} />}><Route path={route.path} element={accountPages[route.key]} /></Route>)}<Route index element={<Dashboard />} /><Route path="complaints" element={<Complaints />} /><Route path="notifications" element={<Pending title="Notifications" />} /><Route element={<Protected roles={['student', 'warden', 'admin']} />}><Route path="visitors" element={<Visitors />} /><Route path="leave" element={<Leave />} /><Route path="fees" element={<Pending title="Fees" />} /></Route></Route><Route path="*" element={<><h1>Page not found</h1><NavLink to="/">Go to dashboard</NavLink></>} /></Routes>}{!loading && !user && error && <button onClick={() => window.location.reload()}>Retry connection</button>}</Content></div></>;
}
