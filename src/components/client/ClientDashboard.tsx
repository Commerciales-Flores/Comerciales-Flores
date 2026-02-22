import { Routes, Route } from 'react-router-dom';
import Header from '../shared/Header';
import BrowseSpaces from './BrowseSpaces';
import MyBookings from './MyBookings';
import Payments from './Payments';
import Contact from './Contact';
import Insights from './Insights';

export default function ClientDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Routes>
        <Route index element={<BrowseSpaces />} />
        <Route path="bookings" element={<MyBookings />} />
        <Route path="payments" element={<Payments />} />
        <Route path="contact" element={<Contact />} />
        <Route path="insights" element={<Insights />} />
      </Routes>
    </div>
  );
}
