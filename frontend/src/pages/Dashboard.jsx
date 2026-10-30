import { useAuth } from '../auth';
import { Alert } from '../components/ui';
import Complaints from './Complaints';
export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === 'maintenance') return <Complaints heading="Assigned maintenance work" />;
  return <><h1>Dashboard</h1><p>Welcome, {user.name || 'hostel user'}.</p><Alert>Select a service from the navigation.</Alert></>;
}
