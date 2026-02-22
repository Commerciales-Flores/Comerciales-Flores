import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Client Pages
import ClientDashboard from './pages/client/Dashboard';
import ClientProperties from './pages/client/Properties';
<<<<<<< HEAD
import ClientReservations from './pages/client/Reservations';
=======
import ClientBookings from './pages/client/Bookings';
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f
import ClientPayments from './pages/client/Payments';
import ClientNotifications from './pages/client/Notifications';
import ClientProfile from './pages/client/Profile';
import ClientMessages from './pages/client/messages';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminCustomers from './pages/admin/Customers';
<<<<<<< HEAD
import AdminAudit from './pages/admin/Audit';
import AdminBusinessSlots from './pages/admin/BusinessSlots';
import AdminReservations from './pages/admin/Reservations';
=======
import AdminBusinessSlots from './pages/admin/BusinessSlots';
import AdminBookings from './pages/admin/Bookings';
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f
import AdminPayments from './pages/admin/Payments';
import AdminInquiries from './pages/admin/Inquiries';
import AdminContent from './pages/admin/Content';
import AdminAnalytics from './pages/admin/Analytics';
import AdminProfile from './pages/admin/Profile';

// Layouts
import ClientLayout from './components/layouts/ClientLayout';
import AdminLayout from './components/layouts/AdminLayout';
<<<<<<< HEAD
import { ProtectedRoute, GuestRoute } from './components/auth/RouteGuards';
=======
import ProtectedRoute from './components/ProtectedRoute';
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <DataProvider>
          <NotificationProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
<<<<<<< HEAD
              <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
=======
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f

              {/* Client Routes */}
              <Route
                path="/client/*"
                element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <ClientLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/client/dashboard" replace />} />
                <Route path="dashboard" element={<ClientDashboard />} />
                <Route path="properties" element={<ClientProperties />} />
<<<<<<< HEAD
                <Route path="reservations" element={<ClientReservations />} />
=======
                <Route path="reservations" element={<ClientBookings />} />
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f
                <Route path="payments" element={<ClientPayments />} />
                <Route path="notifications" element={<ClientNotifications />} />
                <Route path="messages" element={<ClientMessages />} />
                <Route path="profile" element={<ClientProfile />} />
              </Route>

              {/* Admin Routes */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="customers" element={<AdminCustomers />} />
<<<<<<< HEAD
                <Route path="audit" element={<AdminAudit />} />
                <Route path="business-slots" element={<AdminBusinessSlots />} />
                <Route path="reservations" element={<AdminReservations />} />
=======
                <Route path="business-slots" element={<AdminBusinessSlots />} />
                <Route path="bookings" element={<AdminBookings />} />
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f
                <Route path="payments" element={<AdminPayments />} />
                <Route path="inquiries" element={<AdminInquiries />} />
                <Route path="content" element={<AdminContent />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="profile" element={<AdminProfile />} />
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificationProvider>
        </DataProvider>
      </AuthProvider>
    </Router>
  );
}
