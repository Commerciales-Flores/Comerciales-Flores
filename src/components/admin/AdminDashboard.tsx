import { Routes, Route } from 'react-router-dom';
import Header from '../shared/Header';
import Dashboard from './Dashboard';
import SpaceManagement from './SpaceManagement';
import BookingManagement from './BookingManagement';
import CustomerManagement from './CustomerManagement';
import PaymentManagement from './PaymentManagement';
import InquiryManagement from './InquiryManagement';
import Analytics from './Analytics';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="spaces" element={<SpaceManagement />} />
        <Route path="bookings" element={<BookingManagement />} />
        <Route path="customers" element={<CustomerManagement />} />
        <Route path="payments" element={<PaymentManagement />} />
        <Route path="inquiries" element={<InquiryManagement />} />
        <Route path="analytics" element={<Analytics />} />
      </Routes>
    </div>
  );
}
