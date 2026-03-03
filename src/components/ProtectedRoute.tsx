import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('client' | 'admin')[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    console.log("[ProtectedRoute] No user → redirecting to /login");
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    const dashboard = user.role === 'admin' ? '/admin/dashboard' : '/client/dashboard';
    console.log(`[ProtectedRoute] User not authorized → redirecting to ${dashboard}`);
    return user.role === 'admin'
      ? <Navigate to="/admin/dashboard" replace />
      : <Navigate to="/client/dashboard" replace />;
  }

  return <>{children}</>;
}
