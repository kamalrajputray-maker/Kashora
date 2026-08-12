import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/layout.css';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    logout();
    navigate('/seller/login');
  };

  // Hide navbar on login/register pages
  if (
    location.pathname === '/seller/login' ||
    location.pathname === '/seller/register'
  ) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>Kashora</h1>
        </div>

        <div className="navbar-content">
          <div className="navbar-user">
            <span className="user-name">
              {user?.first_name} {user?.last_name}
            </span>
            <span className="user-role">{user?.role}</span>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
