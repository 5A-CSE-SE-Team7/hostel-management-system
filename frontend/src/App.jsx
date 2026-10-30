import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import Allocations from './pages/Allocations';
import Inventory from './pages/Inventory';
import MyRoom from './pages/MyRoom';

export default function App() {
  return (
    <BrowserRouter>
      <header>
        <p><strong>Hostel Management System</strong></p>
        <nav aria-label="Main navigation">
          <NavLink to="/inventory">Inventory</NavLink>
          {' · '}<NavLink to="/allocations">Allocations</NavLink>
          {' · '}<NavLink to="/my-room">My room</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Navigate to="/inventory" replace />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/allocations" element={<Allocations />} />
        <Route path="/my-room" element={<MyRoom />} />
        <Route path="*" element={<Navigate to="/inventory" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
