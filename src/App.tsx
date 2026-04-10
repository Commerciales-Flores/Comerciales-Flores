import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ClientDataProvider } from './contexts/ClientDataContext';
import { AdminDataProvider } from './contexts/AdminDataContext';
import { IndicatorProvider } from './contexts/IndicatorContext';
import { ReviewsProvider } from './contexts/ReviewsContext';
import SessionWarningModal from './components/auth/SessionWarningModal';
import { PaymentMethodsProvider } from './contexts/PaymentMethodsContext';
import { Building2 } from 'lucide-react';
import { ServerErrorBoundary } from './pages/errors/ServerErrorBoundary';
import { ProtectedRoute, GuestRoute } from './components/auth/RouteGuards';

// Eager layouts so shell/navbar/sidebar appear immediately
import ClientLayout from './components/layouts/ClientLayout';
import AdminLayout from './components/layouts/AdminLayout';

// Public Pages
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const AllProperties = lazy(() => import('./pages/public/AllProperties'));
const VerifyDevice = lazy(() => import('./pages/auth/VerifyDevice'));
const AuthCallback = lazy(() => import('./pages/auth/AuthCallback'));

// Client Pages
const ClientDashboard = lazy(() => import('./pages/client/Dashboard'));
const ClientProperties = lazy(() => import('./pages/client/Properties'));
const ClientReservations = lazy(() => import('./pages/client/Reservations'));
const ClientPayments = lazy(() => import('./pages/client/Payments'));
const ClientReview = lazy(() => import('./pages/client/Reviews'));
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
const AdminPaymentMethods = lazy(() => import('./components/admin/payment/AdminPaymentMethods'));
const AdminReview = lazy(() => import('./pages/admin/Reviews'));
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

function RouteLoader() {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 bg-white overflow-hidden">
      <div className="absolute top-8 left-8 flex items-center gap-3 select-none">
        <div className="bg-blue-600 p-1.5 sm:p-2 rounded-xl shadow-lg shadow-blue-100">
          <Building2 className="size-5 sm:size-6 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900 tracking-tight">
          Commerciales Flores
        </span>
      </div>

      <div className="max-w-md w-full text-center">
        <h1 className="text-7xl sm:text-8xl font-black text-gray-100 leading-none select-none italic">
          ...
        </h1>

        <div className="relative -mt-8 mb-8 inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl rotate-12 shadow-xl shadow-blue-100">
          <Building2 className="size-10 text-white -rotate-12" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading page</h2>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Please wait while we prepare this page.
        </p>

        <div className="flex items-center justify-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]" />
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-bounce" />
        </div>
      </div>
    </div>
  );
}

function PageSectionLoader() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[2rem] border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-100">
          <Building2 className="size-8 text-white" />
        </div>

        <h2 className="text-xl font-bold text-gray-900">Loading content</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Please wait while this section is being prepared.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]" />
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-bounce" />
        </div>
      </div>
    </div>
  );
}

function RouteSuspense({
  children,
  inLayout = false,
}: {
  children: ReactNode;
  inLayout?: boolean;
}) {
  return (
    <Suspense fallback={inLayout ? <PageSectionLoader /> : <RouteLoader />}>
      {children}
    </Suspense>
  );
}

function preloadAdminRoutes() {
  void import('./pages/admin/Dashboard');
  void import('./pages/admin/Customers');
  void import('./pages/admin/Reservations');
  void import('./pages/admin/Payments');
  void import('./pages/admin/Inquiries');
  void import('./pages/admin/Profile');
}

function preloadClientRoutes() {
  void import('./pages/client/Dashboard');
  void import('./pages/client/Reservations');
  void import('./pages/client/Payments');
  void import('./pages/client/Messages');
  void import('./pages/client/Profile');
}

function RoutePrefetcher() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const preload = () => {
      if (user.role === 'admin') {
        preloadAdminRoutes();
      } else {
        preloadClientRoutes();
      }
    };

    if ('requestIdleCallback' in window) {
  const idleWindow = window as Window & {
    requestIdleCallback: (cb: IdleRequestCallback) => number;
    cancelIdleCallback: (id: number) => void;
  };

  const id = idleWindow.requestIdleCallback(() => preload());

  return () => {
    idleWindow.cancelIdleCallback(id);
  };
}

const timeoutId = globalThis.setTimeout(preload, 250);
return () => globalThis.clearTimeout(timeoutId);
  }, [user?.id, user?.role]);

  return null;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={
          <RouteSuspense>
            <LandingPage />
          </RouteSuspense>
        }
      />
      <Route
        path="/login"
        element={
          <GuestRoute>
            <RouteSuspense>
              <Login />
            </RouteSuspense>
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <RouteSuspense>
              <Register />
            </RouteSuspense>
          </GuestRoute>
        }
      />
      <Route
        path="/auth/callback"
        element={
          <RouteSuspense>
            <AuthCallback />
          </RouteSuspense>
        }
      />
      <Route
        path="/reset-password"
        element={
          <RouteSuspense>
            <ResetPassword />
          </RouteSuspense>
        }
      />
      <Route
        path="/verify-device"
        element={
          <RouteSuspense>
            <VerifyDevice />
          </RouteSuspense>
        }
      />
      <Route
        path="/spaces"
        element={
          <RouteSuspense>
            <AllProperties />
          </RouteSuspense>
        }
      />

      {/* Error Pages */}
      <Route
        path="/401"
        element={
          <RouteSuspense>
            <UnauthorizePage />
          </RouteSuspense>
        }
      />
      <Route
        path="/403"
        element={
          <RouteSuspense>
            <ForbiddenPage />
          </RouteSuspense>
        }
      />
      <Route
        path="/500"
        element={
          <RouteSuspense>
            <ServerErrorPage />
          </RouteSuspense>
        }
      />

      {/* Client Routes */}
      <Route
        path="/client/*"
        element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientDataProvider>
              <ServerErrorBoundary>
                <ClientLayout />
              </ServerErrorBoundary>
            </ClientDataProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/client/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <RouteSuspense inLayout>
              <ClientDashboard />
            </RouteSuspense>
          }
        />
        <Route
          path="properties"
          element={
            <RouteSuspense inLayout>
              <ClientProperties />
            </RouteSuspense>
          }
        />
        <Route
          path="reservations"
          element={
            <RouteSuspense inLayout>
              <ClientReservations />
            </RouteSuspense>
          }
        />
        <Route
          path="payments"
          element={
            <RouteSuspense inLayout>
              <ClientPayments />
            </RouteSuspense>
          }
        />
        <Route
          path="reviews"
          element={
            <RouteSuspense inLayout>
              <ClientReview />
            </RouteSuspense>
          }
        />
        <Route
          path="notifications"
          element={
            <RouteSuspense inLayout>
              <ClientNotifications />
            </RouteSuspense>
          }
        />
        <Route
          path="messages"
          element={
            <RouteSuspense inLayout>
              <ClientMessages />
            </RouteSuspense>
          }
        />
        <Route
          path="profile"
          element={
            <RouteSuspense inLayout>
              <ClientProfile />
            </RouteSuspense>
          }
        />
        <Route
          path="*"
          element={
            <RouteSuspense inLayout>
              <NotFoundPage />
            </RouteSuspense>
          }
        />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDataProvider>
              <ServerErrorBoundary>
                <AdminLayout />
              </ServerErrorBoundary>
            </AdminDataProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <RouteSuspense inLayout>
              <AdminDashboard />
            </RouteSuspense>
          }
        />
        <Route
          path="customers"
          element={
            <RouteSuspense inLayout>
              <AdminCustomers />
            </RouteSuspense>
          }
        />
        <Route
          path="audit"
          element={
            <RouteSuspense inLayout>
              <AdminAudit />
            </RouteSuspense>
          }
        />
        <Route
          path="business-slots"
          element={
            <RouteSuspense inLayout>
              <AdminBusinessSlots />
            </RouteSuspense>
          }
        />
        <Route
          path="reservations"
          element={
            <RouteSuspense inLayout>
              <AdminReservations />
            </RouteSuspense>
          }
        />
        <Route
          path="payments"
          element={
            <RouteSuspense inLayout>
              <AdminPayments />
            </RouteSuspense>
          }
        />
        <Route
          path="payment-methods"
          element={
            <RouteSuspense inLayout>
              <AdminPaymentMethods />
            </RouteSuspense>
          }
        />
        <Route
          path="reviews"
          element={
            <RouteSuspense inLayout>
              <AdminReview />
            </RouteSuspense>
          }
        />
        <Route
          path="inquiries"
          element={
            <RouteSuspense inLayout>
              <AdminInquiries />
            </RouteSuspense>
          }
        />
        <Route
          path="content"
          element={
            <RouteSuspense inLayout>
              <AdminContent />
            </RouteSuspense>
          }
        />
        <Route
          path="analytics"
          element={
            <RouteSuspense inLayout>
              <AdminAnalytics />
            </RouteSuspense>
          }
        />
        <Route
          path="profile"
          element={
            <RouteSuspense inLayout>
              <AdminProfile />
            </RouteSuspense>
          }
        />
        <Route
          path="*"
          element={
            <RouteSuspense inLayout>
              <NotFoundPage />
            </RouteSuspense>
          }
        />
      </Route>

      {/* Global Catch-all */}
      <Route
        path="*"
        element={
          <RouteSuspense>
            <NotFoundPage />
          </RouteSuspense>
        }
      />
    </Routes>
  );
}

function SessionManager() {
  const { showSessionWarning, sessionCountdown, extendSession, logout, user } = useAuth();

  return (
    <SessionWarningModal
      open={!!user && showSessionWarning}
      countdown={sessionCountdown}
      title={user?.role === 'admin' ? 'Admin session expiring soon' : 'Session expiring soon'}
      onStaySignedIn={extendSession}
      onLogout={() => logout('Session ended by user')}
    />
  );
}

export default function App() {
  return (
    <Router>
      <IndicatorProvider>
        <AuthProvider>
          <DataProvider>
            <ReviewsProvider>
              <PaymentMethodsProvider>
                <RoutePrefetcher />
                <AppRoutes />
                <SessionManager />
              </PaymentMethodsProvider>
            </ReviewsProvider>
          </DataProvider>
        </AuthProvider>
      </IndicatorProvider>
    </Router>
  );
}