import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// import { adminAPI } from '../../services/api'; // Assuming you'll add an API later

export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(false); // Set to true when fetching real data
  
  // Static placeholder data for now
  const [stats] = useState({
    total_sellers: 15,
    approved_sellers: 12,
    pending_sellers: 3,
    total_buyers: 142,
    total_products: 350,
    pending_products: 24,
    total_orders: 89,
    pending_orders: 12,
  });

  if (isLoading) {
    return <div className="adm-loading">Loading dashboard...</div>;
  }

  const kpis = [
    {
      label: 'Total Sellers',
      value: stats.total_sellers,
      icon: '▣',
      accentColor: '#6366f1',
      iconBg: 'rgba(99,102,241,0.1)',
      iconColor: '#4f46e5',
    },
    {
      label: 'Pending Sellers',
      value: stats.pending_sellers,
      icon: '◈',
      accentColor: '#10b981',
      iconBg: 'rgba(16,185,129,0.1)',
      iconColor: '#059669',
    },
    {
      label: 'Total Buyers',
      value: stats.total_buyers,
      icon: '◎',
      accentColor: '#f59e0b',
      iconBg: 'rgba(245,158,11,0.1)',
      iconColor: '#d97706',
    },
    {
      label: 'Total Orders',
      value: stats.total_orders,
      icon: '≡',
      accentColor: '#ef4444',
      iconBg: 'rgba(239,68,68,0.1)',
      iconColor: '#dc2626',
    },
  ];

  const quickLinks = [
    { label: 'Manage Sellers',   icon: '▣', to: '/admin/sellers' },
    { label: 'Manage Buyers',    icon: '◎', to: '/admin/buyers' },
    { label: 'Categories',       icon: '◈', to: '/admin/categories' },
    { label: 'Products',         icon: '≡', to: '/admin/products' },
  ];

  return (
    <>
      {/* Page header */}
      <div className="adm-page-header">
        <h1>Overview</h1>
        <p>Welcome to the Kashora Admin Control Panel.</p>
      </div>

      {/* KPI stats */}
      <div className="adm-stats">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="adm-stat-card"
            style={{ '--card-accent': kpi.accentColor, '--card-icon-bg': kpi.iconBg, '--card-icon-color': kpi.iconColor } as React.CSSProperties}
          >
            <div className="adm-stat-icon">{kpi.icon}</div>
            <div className="adm-stat-label">{kpi.label}</div>
            <div className="adm-stat-value">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '24px' }}>
        
        {/* Quick Actions */}
        <div className="adm-card">
          <div className="adm-card__head">
            <h2 className="adm-card__title">Quick Actions</h2>
          </div>
          <div className="adm-card__body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {quickLinks.map((ql) => (
                <Link
                  key={ql.to}
                  to={ql.to}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '16px', borderRadius: '12px',
                    textDecoration: 'none', color: 'var(--adm-text-2)',
                    background: 'var(--adm-bg)', border: '1px solid var(--adm-card-border)',
                    transition: 'all var(--adm-transition)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'var(--adm-accent)';
                    e.currentTarget.style.color = 'var(--adm-accent-text)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--adm-card-border)';
                    e.currentTarget.style.color = 'var(--adm-text-2)';
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>{ql.icon}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{ql.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Attention Needed */}
        <div className="adm-card">
          <div className="adm-card__head">
            <h2 className="adm-card__title">Needs Attention</h2>
          </div>
          <div className="adm-card__body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--adm-card-border)' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--adm-text-1)', fontSize: '0.9rem' }}>Pending Sellers</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Awaiting approval</div>
                </div>
                <span className="adm-badge adm-badge--yellow">{stats.pending_sellers} pending</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--adm-card-border)' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--adm-text-1)', fontSize: '0.9rem' }}>Pending Products</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Require review</div>
                </div>
                <span className="adm-badge adm-badge--yellow">{stats.pending_products} items</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--adm-text-1)', fontSize: '0.9rem' }}>Pending Orders</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Processing issues</div>
                </div>
                <span className="adm-badge adm-badge--red">{stats.pending_orders} orders</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
