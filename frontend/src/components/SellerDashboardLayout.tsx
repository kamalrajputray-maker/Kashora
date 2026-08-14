import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/SellerThemeContext';
import '../styles/seller-dashboard.css';

const sidebarItems = [
  { name: 'Dashboard',  path: '/seller/dashboard', icon: '▦' },
  { name: 'Profile',    path: '/seller/profile',   icon: '◎' },
  { name: 'Products',   path: '/seller/products',  icon: '▣' },
  { name: 'Inventory',  path: '/seller/inventory', icon: '≡' },
  { name: 'Orders',     path: '/seller/orders',    icon: '◈' },
];

function LayoutInner({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/seller/login');
  };

  const closeSidebarOnMobile = () => {
    if (isMobile) setSidebarOpen(false);
  };

  const currentPage = sidebarItems.find((i) =>
    location.pathname === i.path || location.pathname.startsWith(i.path + '/')
  )?.name || 'Seller Panel';

  return (
    <div className="sel-layout" data-theme={theme}>
      {/* Mobile overlay */}
      {isMobile && isSidebarOpen && (
        <div className="sel-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sel-sidebar${isSidebarOpen ? '' : ' sel-sidebar--collapsed'}`}>
        <div className="sel-sidebar__header">
          <div className="sel-sidebar__logo">
            <span className="sel-sidebar__logo-mark">K</span>
            <span className="sel-sidebar__logo-text">ashora</span>
          </div>
          {isMobile && (
            <button
              className="sel-sidebar__close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              ✕
            </button>
          )}
        </div>

        <nav className="sel-sidebar__nav">
          <p className="sel-sidebar__section-label">NAVIGATION</p>
          <ul>
            {sidebarItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `sel-sidebar__link${isActive ? ' sel-sidebar__link--active' : ''}`
                  }
                  onClick={closeSidebarOnMobile}
                >
                  <span className="sel-sidebar__link-icon">{item.icon}</span>
                  <span className="sel-sidebar__link-text">{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sel-sidebar__footer">
          <div className="sel-sidebar__user">
            <div className="sel-sidebar__avatar">
              {user?.first_name?.[0]?.toUpperCase() || 'S'}
            </div>
            <div className="sel-sidebar__user-info">
              <span className="sel-sidebar__user-name">
                {user?.first_name} {user?.last_name}
              </span>
              <span className="sel-sidebar__user-role">Seller</span>
            </div>
          </div>
          <button className="sel-sidebar__logout" onClick={handleLogout}>
            <span>↪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="sel-main">
        <header className="sel-header">
          <button
            className="sel-header__toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
          >
            <span />
            <span />
            <span />
          </button>

          <div className="sel-header__title">{currentPage}</div>

          <div className="sel-header__right">
            {/* Dark / Light toggle */}
            <button
              className="sel-theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            <div className="sel-header__user-chip">
              <div className="sel-header__avatar">{user?.first_name?.[0]?.toUpperCase() || 'S'}</div>
              <span className="sel-header__user-name">{user?.first_name} {user?.last_name}</span>
            </div>

            <button className="sel-header__logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="sel-content">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}

export default function SellerDashboardLayout({ children }: { children?: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LayoutInner>{children}</LayoutInner>
    </ThemeProvider>
  );
}
