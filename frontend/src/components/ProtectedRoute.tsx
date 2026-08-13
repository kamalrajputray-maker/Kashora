import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * A single role string OR an array of allowed roles.
   * e.g. requiredRole="SELLER"  OR  requiredRole={["ADMIN","SUPER_ADMIN"]}
   */
  requiredRole?: string | string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading-container">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    // Send each role type to the right login page
    return <Navigate to="/seller/login" replace />;
  }

  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowed.includes(user.role)) {
      // Redirect to the page appropriate for their actual role
      if (user.role === 'SELLER') return <Navigate to="/seller/dashboard" replace />;
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')
        return <Navigate to="/admin/sellers" replace />;
      if (user.role === 'BUYER') return <Navigate to="/products" replace />;
      return <Navigate to="/seller/login" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
