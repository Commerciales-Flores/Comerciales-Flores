// ErrorWrapper.tsx
import React from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, Navigate, Outlet } from 'react-router-dom';
import UnauthorizedPage from '../../pages/errors/UnauthorizedPage';
import ForbiddenPage from '../../pages/errors/ForbiddenPage';
import NotFoundPage from '../../pages/errors/NotFoundPage';
import ServerErrorPage from '../../pages/errors/ServerErrorPage';

interface ErrorWrapperProps {
  validPaths: string[];
  allowedRoles?: string[];
  children?: ReactNode; // <-- Add this
}

const ErrorWrapper: React.FC<ErrorWrapperProps> = ({ validPaths, allowedRoles, children }) => {
  const { user } = useAuth();
  const location = useLocation();

  // 401 → Not logged in
  if (allowedRoles && !user) {
    return <UnauthorizedPage />;
  }

  // 403 → Logged in but role not allowed
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <ForbiddenPage />;
  }

  // 404 → invalid path
  if (!validPaths.includes(location.pathname)) {
    return <NotFoundPage />;
  }

  // 500 → example: you can trigger this via prop or context if needed
  // if (someServerError) return <ServerErrorPage />;

  return <>{children ?? <Outlet />}</>;
};

export default ErrorWrapper;