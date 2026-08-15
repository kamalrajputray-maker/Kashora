import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AdminThemeProvider, useAdminTheme } from '../context/AdminThemeContext';
import { settingsAPI, SiteSettings } from '../services/api';
import '../styles/admin-dashboard.css';

const sidebarItems = [
  { name: 'Dashboard',   path: '/admin/dashboard',    icon: '▦', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Sellers',     path: '/admin/sellers',       icon: '▣', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Buyers',      path: '/admin/buyers',        icon: '◎', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Categories',  path: '/admin/categories',    icon: '◈', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Products',    path: '/admin/products',      icon: '≡', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Orders',      path: '/admin/orders',        icon: '◈', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Reports',     path: '/admin/reports',       icon: '◎', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Settings',    path: '/admin/settings',      icon: '⚙', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Admins',      path: '/super-admin/admins',  icon: '▣', roles: ['SUPER_ADMIN'] },
];

function AdminLayoutInner({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useAdminTheme();

  // Default open on desktop, closed on mobile
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    settingsAPI.get().then(res => setSiteSettings(res.data)).catch(() => {});
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const filteredItems = sidebarItems.filter(
    (item) => user?.role && item.roles.includes(user.role)
  );

  const closeSidebarOnMobile = () => {
    if (isMobile) setSidebarOpen(false);
  };

  const currentPage = sidebarItems.find((i) =>
    location.pathname === i.path || location.pathname.startsWith(i.path + '/')
  )?.name || 'Admin Panel';

  return (
    <div className="adm-layout" data-adm-theme={theme}>
      {/* Overlay for mobile */}
      {isMobile && isSidebarOpen && (
        <div className="adm-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`adm-sidebar${isSidebarOpen ? '' : ' adm-sidebar--collapsed'}`}>
        <div className="adm-sidebar__header">
          {siteSettings?.site_logo ? (
            <div className="adm-sidebar__logo" style={{ display: 'flex', alignItems: 'center' }}>
              <img src={siteSettings.site_logo} alt="Kashora Admin Logo" style={{ height: '32px', objectFit: 'contain' }} />
            </div>
          ) : (
            <div className="adm-sidebar__logo">
              <span className="adm-sidebar__logo-mark">K</span>
              <span className="adm-sidebar__logo-text">ashora Admin</span>
            </div>
          )}
          {isMobile && (
            <button
              className="adm-sidebar__close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              ✕
            </button>
          )}
        </div>

        <nav className="adm-sidebar__nav">
          <p className="adm-sidebar__section-label">MENU</p>
          <ul>
            {filteredItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `adm-sidebar__link${isActive ? ' adm-sidebar__link--active' : ''}`
                  }
                  onClick={closeSidebarOnMobile}
                >
                  <span className="adm-sidebar__link-icon">{item.icon}</span>
                  <span className="adm-sidebar__link-text">{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="adm-sidebar__footer">
          <div className="adm-sidebar__user">
            <div className="adm-sidebar__avatar">
              {user?.first_name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="adm-sidebar__user-info">
              <span className="adm-sidebar__user-name">
                {user?.first_name} {user?.last_name}
              </span>
              <span className="adm-sidebar__user-role">{user?.role?.replace('_', ' ')}</span>
            </div>
          </div>
          <button className="adm-sidebar__logout" onClick={handleLogout}>
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="adm-main">
        {/* Header */}
        <header className="adm-header">
          <button
            className="adm-header__toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
          >
            <span />
            <span />
            <span />
          </button>

          <div className="adm-header__title">
            {currentPage}
          </div>

          <div className="adm-header__right">
            {/* Dark / Light toggle */}
            <button
              className="adm-theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            <div className="adm-header__user-chip">
              <span className="adm-header__user-name">
                {user?.first_name} {user?.last_name}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="adm-content">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}

export default function AdminDashboardLayout({ children }: { children?: React.ReactNode }) {
  return (
    <AdminThemeProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminThemeProvider>
  );
}
