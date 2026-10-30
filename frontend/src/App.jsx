import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import Inventory from './pages/Inventory';

export default function App() {
  return (
    <BrowserRouter>
      <header>
        <p><strong>Hostel Management System</strong></p>
        <nav aria-label="Main navigation">
          <NavLink to="/inventory">Inventory</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Navigate to="/inventory" replace />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="*" element={<Navigate to="/inventory" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
