import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';

const NotFoundPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', margin: '20px 0' }}>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you are looking for doesn't exist.</p>

        <div style={{ marginTop: '30px' }}>
          {isAuthenticated ? (
            user?.role === 'SELLER' ? (
              <Link to="/seller/dashboard" className="btn btn-primary">
                Go to Seller Dashboard
              </Link>
            ) : user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? (
              <Link to="/admin/sellers" className="btn btn-primary">
                Go to Admin Panel
              </Link>
            ) : null
          ) : (
            <Link to="/seller/login" className="btn btn-primary">
              Go to Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
