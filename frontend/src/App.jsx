import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

function SignedInHome() {
  const { user, logout, error } = useAuth();
  return (
    <main className="registration">
      <h1>Welcome, {user.name}</h1>
      <p className="intro">You are signed in as a {user.role}.</p>
      {error && <p className="alert" role="alert">{error}</p>}
      <button type="button" onClick={logout}>Sign out</button>
    </main>
  );
}

export default function App() {
  const { user, loading, error } = useAuth();
  if (loading) return <p className="registration" role="status">Checking your session…</p>;
  if (user) return <SignedInHome />;

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
