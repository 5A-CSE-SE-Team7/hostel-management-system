import Notifications from './pages/Notifications';
import { useState } from 'react';
import Reports from './pages/Reports';
import Fees from './pages/Fees';
import Visitors from './pages/Visitors';
import Leave from './pages/Leave';
import Complaints from './pages/Complaints';
import Dashboard from './pages/Dashboard';
import NotificationCount from './components/NotificationCount';
import Footer from './components/Footer';
import ThemeToggle from './components/ThemeToggle';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { Alert, Badge, Field } from './components/ui';
export const navigation = [
  { path: '/reports', label: 'Reports', roles: ['warden','admin'] },
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
  return <><a className="skip" href="#content">Skip to content</a><header className="swiss-header"><div className="brand-group"><div className="brand-logo-icon" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="24" height="24" stroke="currentColor" strokeWidth="2" /><rect x="8" y="8" width="12" height="12" fill="currentColor" /><line x1="2" y1="14" x2="26" y2="14" stroke="currentColor" strokeWidth="1" /><line x1="14" y1="2" x2="14" y2="26" stroke="currentColor" strokeWidth="1" /></svg></div><div className="brand-text-block"><strong>Hostel Management System</strong><span className="brand-edition-tag">SYSTEM 07 // RESIDENCE</span></div></div><div className="header-actions"><ThemeToggle /><a href="#contact" className="pill-btn header-contact-btn">Contact</a>{user && <div className="user-controls"><Badge>{user.role}</Badge><button className="pill-btn signout-btn" onClick={async () => { try { await logout(); } catch (e) { setLogoutError(e.message); } }}>Sign out</button></div>}</div></header><div className="layout">{user && <nav aria-label="Main navigation">{[...navigation, ...extensions].filter(n => n.roles.includes(user.role)).map(n => <NavLink key={n.path} to={n.path} end={n.path === '/'}>{n.label}{n.path === '/notifications' && <NotificationCount />}</NavLink>)}</nav>}<Content id="content" tabIndex="-1"><Alert error>{logoutError}</Alert>{loading ? <Alert>Checking your session…</Alert> : <Routes><Route path="/login" element={user ? <Navigate to="/" replace /> : loginPage || <Login registrationEnabled={!!registrationPage} />} />{registrationPage && <Route path="/register" element={user ? <Navigate to="/" replace /> : registrationPage} />}<Route element={<Protected />}>{extensions.map(route => <Route key={route.key} element={<Protected roles={route.roles} />}><Route path={route.path} element={accountPages[route.key]} /></Route>)}<Route element={<Protected roles={['warden','admin']} />}><Route path="reports" element={<Reports />} /></Route><Route index element={<Dashboard />} /><Route path="complaints" element={<Complaints />} /><Route path="notifications" element={<Notifications />} /><Route element={<Protected roles={['student', 'warden', 'admin']} />}><Route path="visitors" element={<Visitors />} /><Route path="leave" element={<Leave />} /><Route path="fees" element={<Fees />} /></Route></Route><Route path="*" element={<><h1>Page not found</h1><NavLink to="/">Go to dashboard</NavLink></>} /></Routes>}{!loading && !user && error && <button onClick={() => window.location.reload()}>Retry connection</button>}</Content></div><Footer /></>;
}
