import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Profile from './pages/Profile.jsx';
import Register from './pages/Register.jsx';
import Students from './pages/Students.jsx';
import Users from './pages/Users.jsx';

function SignedInHome() {
  const { user, logout, error } = useAuth();
  return (
    <main className="registration">
      <h1>Welcome, {user.name}</h1>
      <p className="intro">You are signed in as a {user.role}.</p>
      {error && <p className="alert" role="alert">{error}</p>}
      <nav className="account-links" aria-label="Account">
        <Link to="/profile">My profile</Link>
        {['warden', 'admin'].includes(user.role) && <Link to="/students">Manage students</Link>}
        {user.role === 'admin' && <Link to="/users">Users &amp; roles</Link>}
      </nav>
      <button type="button" onClick={logout}>Sign out</button>
    </main>
  );
}

export default function App() {
  const { user, loading, error } = useAuth();
  if (loading) return <p className="registration" role="status">Checking your session…</p>;
  if (user) {
    return (
      <Routes>
        <Route path="/" element={<SignedInHome />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/students" element={['warden', 'admin'].includes(user.role) ? <Students /> : <Navigate to="/" replace />} />
        <Route path="/users" element={user.role === 'admin' ? <Users /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <>
      {error && <p className="registration alert" role="alert">{error}</p>}
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
