import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { IndicatorProvider } from './contexts/IndicatorContext';


// Public Pages
import LandingPage from './pages/public/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Client Pages
import ClientDashboard from './pages/client/Dashboard';
import ClientProperties from './pages/client/Properties';
import ClientReservations from './pages/client/Reservations';
import ClientPayments from './pages/client/Payments';
import ClientNotifications from './pages/client/Notifications';
import ClientProfile from './pages/client/Profile';
import ClientMessages from './pages/client/messages';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminCustomers from './pages/admin/Customers';
import AdminAudit from './pages/admin/Audit';
import AdminBusinessSlots from './pages/admin/BusinessSlots';
import AdminReservations from './pages/admin/Reservations';
import AdminPayments from './pages/admin/Payments';
import AdminInquiries from './pages/admin/Inquiries';
import AdminContent from './pages/admin/Content';
import AdminAnalytics from './pages/admin/Analytics';
import AdminProfile from './pages/admin/Profile';

// Error Pages
import { UnauthorizePage, ForbiddenPage, NotFoundPage, ServerErrorPage } from './pages/errors';
import { ServerErrorBoundary } from './pages/errors/ServerErrorBoundary';

// Layouts
import ClientLayout from './components/layouts/ClientLayout';
import AdminLayout from './components/layouts/AdminLayout';
import { ProtectedRoute, GuestRoute } from './components/auth/RouteGuards';
import AllProperties from './pages/public/AllProperties';

export default function App() {
  return (
    <IndicatorProvider>
      <Router>
        <AuthProvider>
          <DataProvider>
            <NotificationProvider>
              <Routes>
                {/* --- Public Routes --- */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
                <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
                <Route path="/spaces" element={<AllProperties />} />

                {/* --- Error Pages (always full screen) --- */}
                <Route path="/401" element={<UnauthorizePage />} />
                <Route path="/403" element={<ForbiddenPage />} />
                <Route path="/500" element={<ServerErrorPage />} />

                {/* --- Client Routes --- */}
                <Route
                  path="/client/*"
                  element={
                    <ProtectedRoute allowedRoles={['client']}>
                      <ServerErrorBoundary>
                        <ClientLayout />
                      </ServerErrorBoundary>
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/client/dashboard" replace />} />
                  <Route path="dashboard" element={<ClientDashboard />} />
                  <Route path="properties" element={<ClientProperties />} />
                  <Route path="reservations" element={<ClientReservations />} />
                  <Route path="payments" element={<ClientPayments />} />
                  <Route path="notifications" element={<ClientNotifications />} />
                  <Route path="messages" element={<ClientMessages />} />
                  <Route path="profile" element={<ClientProfile />} />
                  {/* Internal catch-all for /client/* */}
                  <Route path="*" element={<NotFoundPage />} />
                </Route>

                {/* --- Admin Routes --- */}
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <ServerErrorBoundary>
                        <AdminLayout />
                      </ServerErrorBoundary>
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="customers" element={<AdminCustomers />} />
                  <Route path="audit" element={<AdminAudit />} />
                  <Route path="business-slots" element={<AdminBusinessSlots />} />
                  <Route path="reservations" element={<AdminReservations />} />
                  <Route path="payments" element={<AdminPayments />} />
                  <Route path="inquiries" element={<AdminInquiries />} />
                  <Route path="content" element={<AdminContent />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="profile" element={<AdminProfile />} />
                  {/* Internal catch-all for /admin/* */}
                  <Route path="*" element={<NotFoundPage />} />
                </Route>

                {/* --- Global Catch-all for root-level typos --- */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </NotificationProvider>
          </DataProvider>
        </AuthProvider>
      </Router>
    </IndicatorProvider>
  );
}
