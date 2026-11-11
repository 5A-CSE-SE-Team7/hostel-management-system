import { useAuth } from '../auth';
import { Alert } from '../components/ui';
import Complaints from './Complaints';
import ServiceCards from '../components/ServiceCards';
import ShowcaseGrid from '../components/ShowcaseGrid';
import NarrativeSection from '../components/NarrativeSection';

export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === 'maintenance') return <Complaints heading="Assigned maintenance work" />;
  return (
    <div className="dashboard-container">
      <div className="dashboard-header-block">
        <h1>Dashboard</h1>
        <p>Welcome, {user.name || 'hostel user'}.</p>
        <Alert>Select a service from the navigation.</Alert>
      </div>

      <div className="dashboard-editorial-section">
        <ServiceCards />
        <ShowcaseGrid />
        <NarrativeSection />
      </div>
    </div>
  );
}
