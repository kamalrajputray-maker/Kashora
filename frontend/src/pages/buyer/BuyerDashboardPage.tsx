import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Premium Meesho/Amazon–style colors and styling
const S = {
  container: { padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif", minHeight: '100vh', background: '#f8fafc' },
  header: {
    background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
    borderRadius: '16px',
    padding: '2.5rem',
    color: '#fff',
    marginBottom: '2rem',
    boxShadow: '0 10px 25px rgba(124, 58, 237, 0.15)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  title: { fontSize: '2rem', fontWeight: '800', margin: 0 },
  subtitle: { fontSize: '1rem', opacity: 0.9, marginTop: '0.5rem', fontWeight: '500' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' },
  card: { background: '#fff', padding: '1.75rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', display: 'flex', gap: '1.25rem', alignItems: 'center', transition: 'transform 0.2s, box-shadow 0.2s' },
  cardIcon: (bg: string) => ({
    width: '56px', height: '56px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
  }),
  cardContent: { display: 'flex', flexDirection: 'column' as const, gap: '0.2rem' },
  cardLabel: { fontSize: '0.82rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  cardValue: { fontSize: '1.75rem', fontWeight: '800', color: '#0f172a' },
  cardStatus: { fontSize: '0.8rem', color: '#10b981', fontWeight: '600' },
  mainLayout: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' },
  sectionCard: { background: '#fff', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' },
  sectionTitle: { fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' },
  emptyState: { textAlign: 'center' as const, padding: '3.5rem 1.5rem', display: 'flex', flexDirection: 'column' as const, alignItems: 'center' as const, gap: '1rem' },
  emptyIcon: { fontSize: '3.5rem', lineHeight: 1 },
  emptyTitle: { fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', margin: 0 },
  emptyDesc: { fontSize: '0.9rem', color: '#64748b', maxWidth: '320px', margin: 0 },
  shopBtn: { background: 'linear-gradient(135deg, #7c3aed, #db2777)', color: '#fff', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.25)', transition: 'all 0.2s', marginTop: '0.5rem' },
  shortcutGrid: { display: 'flex', flexDirection: 'column' as const, gap: '0.85rem' },
  shortcutBtn: { width: '100%', padding: '1rem 1.25rem', textAlign: 'left' as const, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.95rem', fontWeight: '600', color: '#334155', transition: 'all 0.2s' },
};

const BuyerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={S.container}>
      {/* Welcome Banner */}
      <div style={S.header}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={S.title}>🛍️ Welcome back, {user?.first_name || 'Buyer'}!</h1>
          <p style={S.subtitle}>Manage your orders, view saved items, and track shopping activity from one dashboard.</p>
        </div>
      </div>

      {/* Grid Summary */}
      <div style={S.grid}>
        <div style={S.card}>
          <div style={S.cardIcon('#dbeafe')}>📦</div>
          <div style={S.cardContent}>
            <span style={S.cardLabel}>Active Orders</span>
            <span style={S.cardValue}>0</span>
            <span style={S.cardStatus}>All caught up!</span>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.cardIcon('#e0f2fe')}>🛒</div>
          <div style={S.cardContent}>
            <span style={S.cardLabel}>Items in Cart</span>
            <span style={S.cardValue}>0</span>
            <span style={{ ...S.cardStatus, color: '#64748b' }}>Ready for checkout?</span>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.cardIcon('#fce7f3')}>💖</div>
          <div style={S.cardContent}>
            <span style={S.cardLabel}>Wishlist Items</span>
            <span style={S.cardValue}>0</span>
            <span style={{ ...S.cardStatus, color: '#64748b' }}>Saved for later</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={S.mainLayout} className="buyer-dashboard-body">
        {/* Recent Orders Section */}
        <div style={S.sectionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={S.sectionTitle}>📦 Recent Orders</h2>
            <button style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>View All</button>
          </div>
          <div style={S.emptyState}>
            <div style={S.emptyIcon}>🛍️</div>
            <h3 style={S.emptyTitle}>Your order list is empty</h3>
            <p style={S.emptyDesc}>Looks like you haven't placed any orders yet. Start exploring active catalog products!</p>
            <button 
              onClick={() => navigate('/')}
              style={S.shopBtn}
            >
              Start Shopping
            </button>
          </div>
        </div>

        {/* Shortcuts Section */}
        <div style={S.sectionCard}>
          <h2 style={S.sectionTitle}>⚙️ Account Shortcuts</h2>
          <div style={S.shortcutGrid}>
            <button style={S.shortcutBtn}>
              <span style={{ fontSize: '1.1rem' }}>👤</span> Edit Profile
            </button>
            <button style={S.shortcutBtn}>
              <span style={{ fontSize: '1.1rem' }}>📍</span> Manage Addresses
            </button>
            <button style={S.shortcutBtn}>
              <span style={{ fontSize: '1.1rem' }}>💳</span> Payment Methods
            </button>
            <button style={S.shortcutBtn}>
              <span style={{ fontSize: '1.1rem' }}>🎧</span> Help & Customer Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyerDashboardPage;
