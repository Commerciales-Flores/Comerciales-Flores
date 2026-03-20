import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { IndicatorProvider } from './contexts/IndicatorContext';
import SessionWarningModal from './components/auth/SessionWarningModal';

// Public Pages
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const AllProperties = lazy(() => import('./pages/public/AllProperties'));

// Client Pages
const ClientDashboard = lazy(() => import('./pages/client/Dashboard'));
const ClientProperties = lazy(() => import('./pages/client/Properties'));
const ClientReservations = lazy(() => import('./pages/client/Reservations'));
const ClientPayments = lazy(() => import('./pages/client/Payments'));
const ClientNotifications = lazy(() => import('./pages/client/Notifications'));
const ClientProfile = lazy(() => import('./pages/client/Profile'));
const ClientMessages = lazy(() => import('./pages/client/Messages'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminCustomers = lazy(() => import('./pages/admin/Customers'));
const AdminAudit = lazy(() => import('./pages/admin/Audit'));
const AdminBusinessSlots = lazy(() => import('./pages/admin/BusinessSlots'));
const AdminReservations = lazy(() => import('./pages/admin/Reservations'));
const AdminPayments = lazy(() => import('./pages/admin/Payments'));
const AdminInquiries = lazy(() => import('./pages/admin/Inquiries'));
const AdminContent = lazy(() => import('./pages/admin/Content'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminProfile = lazy(() => import('./pages/admin/Profile'));

// Error Pages
const UnauthorizePage = lazy(() =>
  import('./pages/errors').then((m) => ({ default: m.UnauthorizePage }))
);
const ForbiddenPage = lazy(() =>
  import('./pages/errors').then((m) => ({ default: m.ForbiddenPage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/errors').then((m) => ({ default: m.NotFoundPage }))
);
const ServerErrorPage = lazy(() =>
  import('./pages/errors').then((m) => ({ default: m.ServerErrorPage }))
);

import { ServerErrorBoundary } from './pages/errors/ServerErrorBoundary';

// Layouts
const ClientLayout = lazy(() => import('./components/layouts/ClientLayout'));
const AdminLayout = lazy(() => import('./components/layouts/AdminLayout'));

import { ProtectedRoute, GuestRoute } from './components/auth/RouteGuards';

function RouteLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium text-slate-500">Loading...</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { showSessionWarning, sessionCountdown, extendSession, logout, user } = useAuth();

  return (
    <>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          {/* --- Public Routes --- */}
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/spaces" element={<AllProperties />} />

          {/* --- Error Pages --- */}
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
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* --- Global Catch-all --- */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      <SessionWarningModal
        open={!!user && showSessionWarning}
        countdown={sessionCountdown}
        title={user?.role === 'admin' ? 'Admin session expiring soon' : 'Session expiring soon'}
        onStaySignedIn={extendSession}
        onLogout={() => logout('Session ended by user')}
      />
    </>
  );
}

export default function App() {
  return (
    <IndicatorProvider>
      <Router>
        <AuthProvider>
          <DataProvider>
            <NotificationProvider>
              <AppRoutes />
            </NotificationProvider>
          </DataProvider>
        </AuthProvider>
      </Router>
    </IndicatorProvider>
  );
}