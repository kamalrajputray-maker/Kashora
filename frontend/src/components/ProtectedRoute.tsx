import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading-container">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/seller/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Redirect based on user role
    if (user.role === 'SELLER') {
      return <Navigate to="/seller/dashboard" replace />;
    } else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return <Navigate to="/admin/sellers" replace />;
    } else {
      return <Navigate to="/seller/login" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
