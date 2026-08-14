import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sellerAPI, SellerDashboard } from '../../services/api';

const SellerDashboardPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<SellerDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const response = await sellerAPI.getDashboard();
        setDashboard(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to load dashboard');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return <div className="sp-loading">Loading dashboard...</div>;
  }
  if (error) {
    return <div className="sp-alert sp-alert--error">{error}</div>;
  }
  if (!dashboard) {
    return <div className="sp-empty"><span className="sp-empty__icon">📋</span><span className="sp-empty__text">No data available.</span></div>;
  }

  const stats = [
    {
      label: 'Total Products',
      value: dashboard.total_products,
      icon: '▣',
      accentColor: '#6366f1',
      iconBg: 'rgba(99,102,241,0.1)',
      iconColor: '#4f46e5',
    },
    {
      label: 'Active Orders',
      value: dashboard.active_orders,
      icon: '◈',
      accentColor: '#10b981',
      iconBg: 'rgba(16,185,129,0.1)',
      iconColor: '#059669',
    },
    {
      label: 'Revenue',
      value: typeof dashboard.revenue === 'number'
        ? `₹${dashboard.revenue.toLocaleString('en-IN')}`
        : dashboard.revenue,
      icon: '₹',
      accentColor: '#f59e0b',
      iconBg: 'rgba(245,158,11,0.1)',
      iconColor: '#d97706',
    },
    {
      label: 'Low Stock Items',
      value: dashboard.low_stock_products,
      icon: '⚠',
      accentColor: '#ef4444',
      iconBg: 'rgba(239,68,68,0.1)',
      iconColor: '#dc2626',
    },
  ];

  const quickLinks = [
    { label: 'Products',   icon: '▣', to: '/seller/products' },
    { label: 'Inventory',  icon: '≡', to: '/seller/inventory' },
    { label: 'Orders',     icon: '◈', to: '/seller/orders' },
    { label: 'Profile',    icon: '◎', to: '/seller/profile' },
  ];

  return (
    <>
      {/* Page header */}
      <div className="sp-header">
        <div>
          <h1 className="sp-header__title">Dashboard</h1>
          <p className="sp-header__sub">Welcome back! Here's your store overview.</p>
        </div>
      </div>

      {/* KPI stats */}
      <div className="sp-stats">
        {stats.map((s) => (
          <div
            key={s.label}
            className="sp-stat-card"
            style={{ '--card-accent': s.accentColor, '--card-icon-bg': s.iconBg, '--card-icon-color': s.iconColor } as React.CSSProperties}
          >
            <div className="sp-stat-icon">{s.icon}</div>
            <div className="sp-stat-label">{s.label}</div>
            <div className="sp-stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="sp-card" style={{ marginBottom: 24 }}>
        <div className="sp-card__head">
          <h2 className="sp-card__title">Quick Actions</h2>
        </div>
        <div className="sp-card__body">
          <div className="sp-quick-links">
            {quickLinks.map((ql) => (
              <Link key={ql.to} to={ql.to} className="sp-quick-link">
                <span className="sp-quick-link__icon">{ql.icon}</span>
                <span className="sp-quick-link__label">{ql.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
        <div className="sp-card">
          <div className="sp-card__head">
            <h2 className="sp-card__title">Stock Alert</h2>
            <span className="sp-badge sp-badge--red">{dashboard.low_stock_products} items</span>
          </div>
          <div className="sp-card__body" style={{ color: 'var(--sel-text-muted)', fontSize: '0.875rem' }}>
            {dashboard.low_stock_products === 0
              ? 'All products are well stocked. 🎉'
              : `You have ${dashboard.low_stock_products} product variant(s) running low on stock.`}
            <br /><br />
            <Link to="/seller/inventory" className="sp-btn sp-btn--ghost sp-btn--sm">View Inventory →</Link>
          </div>
        </div>

        <div className="sp-card">
          <div className="sp-card__head">
            <h2 className="sp-card__title">Orders</h2>
            <span className="sp-badge sp-badge--blue">{dashboard.active_orders} active</span>
          </div>
          <div className="sp-card__body" style={{ color: 'var(--sel-text-muted)', fontSize: '0.875rem' }}>
            {dashboard.active_orders === 0
              ? 'No active orders right now.'
              : `You have ${dashboard.active_orders} order(s) awaiting action.`}
            <br /><br />
            <Link to="/seller/orders" className="sp-btn sp-btn--ghost sp-btn--sm">View Orders →</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default SellerDashboardPage;
