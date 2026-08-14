import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import '../styles/admin-dashboard.css';

const sidebarItems = [
  { name: 'Dashboard', path: '/admin/dashboard', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Sellers', path: '/admin/sellers', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Buyers', path: '/admin/buyers', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Categories', path: '/admin/categories', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Products', path: '/admin/products', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Orders', path: '/admin/orders', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Reports', path: '/admin/reports', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Admins', path: '/super-admin/admins', roles: ['SUPER_ADMIN'] },
];

export default function AdminDashboardLayout() {
  const location = useLocation();
  const userRole = (window as any).USER_ROLE; // injected by auth context

  const filteredItems = sidebarItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="logo">Keshro Admin</div>
        <nav>
          <ul>
            {filteredItems.map(item => (
              <li key={item.path} className={location.pathname.startsWith(item.path) ? 'active' : ''}>
                <NavLink to={item.path}>{item.name}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="admin-content">
        <header className="admin-header">
          <div className="search-bar">
            <input type="text" placeholder="Search..." />
          </div>
          <div className="profile-dropdown">
            <span>{(window as any).USER_NAME}</span>
            {/* profile menu could go here */}
          </div>
        </header>
        <section className="admin-page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
