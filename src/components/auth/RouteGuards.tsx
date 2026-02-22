// components/auth/RouteGuards.tsx
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'client')[];
}

interface GuestRouteProps {
  children: ReactNode;
}

// ----------------------
// Protects routes that require login
// ----------------------
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Not logged in → redirect to login, remember the page they tried to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Logged in but not authorized → redirect to their dashboard
    const dashboard = user.role === 'admin' ? '/admin/dashboard' : '/client/dashboard';
    return <Navigate to={dashboard} replace />;
  }

  return <>{children}</>;
}

// ----------------------
// Protects routes like Login/Register for already logged-in users
// ----------------------
export function GuestRoute({ children }: GuestRouteProps) {
  const { user } = useAuth();

  if (user) {
    // Already logged in → send to proper dashboard
    const dashboard = user.role === 'admin' ? '/admin/dashboard' : '/client/dashboard';
    return <Navigate to={dashboard} replace />;
  }

  return <>{children}</>;
}