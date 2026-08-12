import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/layout.css';

const SellerNavigation: React.FC = () => {
  return (
    <nav className="seller-nav">
      <ul className="nav-menu">
        <li>
          <NavLink
            to="/seller/dashboard"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            📊 Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/seller/profile"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            👤 Profile
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/seller/products"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            📦 Products
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/seller/orders"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            🛒 Orders
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/seller/inventory"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            📈 Inventory
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/seller/analytics"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            📉 Analytics
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default SellerNavigation;
