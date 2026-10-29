import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Register from './pages/Register.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/register" replace />} />
    </Routes>
  );
}
