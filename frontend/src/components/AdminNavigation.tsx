import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/layout.css';

const AdminNavigation: React.FC = () => {
  return (
    <nav className="admin-nav">
      <ul className="nav-menu">
        <li>
          <NavLink
            to="/admin/sellers"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            👥 Sellers
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/admin/orders"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            📦 Orders
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/admin/users"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            👤 Users
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/admin/reports"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            📊 Reports
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/admin/settings"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            ⚙️ Settings
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default AdminNavigation;
