import React, { useState, useEffect } from 'react';
import { sellerOrderAPI, SellerOrderItem } from '../../services/api';
import '../../styles/seller.css';

const STATUS_CONFIG: Record<string, { bg: string; color: string }> = {
  PENDING:   { bg: '#fef3c7', color: '#92400e' },
  CONFIRMED: { bg: '#dbeafe', color: '#1e40af' },
  SHIPPED:   { bg: '#e0e7ff', color: '#3730a3' },
  DELIVERED: { bg: '#d1fae5', color: '#065f46' },
  CANCELLED: { bg: '#fee2e2', color: '#991b1b' },
};

const NEXT_STATUS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
};

const S = {
  container: { padding: '2rem', maxWidth: '1100px', margin: '0 auto', fontFamily: "'Outfit', 'Inter', sans-serif" },
  title: { fontSize: '1.75rem', fontWeight: '700', color: '#1e293b', marginBottom: '1.5rem' },
  card: { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem 1.5rem', marginBottom: '1rem' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' },
  label: { fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  value: { fontSize: '0.92rem', color: '#1e293b', fontWeight: '500', marginTop: '0.1rem' },
  badge: (status: string) => {
    const cfg = STATUS_CONFIG[status] || { bg: '#f1f5f9', color: '#64748b' };
    return { background: cfg.bg, color: cfg.color, padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-block' };
  },
  actionBtn: (variant: 'green' | 'red' | 'blue') => ({
    padding: '0.4rem 0.85rem', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem',
    background: variant === 'green' ? '#10b981' : variant === 'red' ? '#ef4444' : '#3b82f6',
    color: '#fff', marginRight: '0.5rem'
  }),
  emptyCard: { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '4rem 2rem', textAlign: 'center' as const }
};

export const SellerOrderListPage: React.FC = () => {
  const [items, setItems] = useState<SellerOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    sellerOrderAPI.list()
      .then(res => setItems(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateStatus = (id: string, newStatus: string) => {
    setUpdating(id);
    sellerOrderAPI.updateStatus(id, newStatus)
      .then(res => {
        setItems(prev => prev.map(i => i.id === id ? res.data : i));
      })
      .catch(err => alert(err.response?.data?.detail || 'Failed to update status.'))
      .finally(() => setUpdating(null));
  };

  if (loading) {
    return <div style={S.container}>Loading orders...</div>;
  }

  return (
    <div style={S.container}>
        <h1 style={S.title}>Orders</h1>

        {items.length === 0 ? (
          <div style={S.emptyCard}>
            <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>📦</span>
            <h3 style={{ fontWeight: '700', color: '#1e293b' }}>No orders yet</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Orders for your products will appear here.</p>
          </div>
        ) : (
          items.map(item => {
            const addr = item.shipping_address;
            const nextStatuses = NEXT_STATUS[item.item_status] || [];
            return (
              <div key={item.id} style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '600' }}>
                      Order #{item.order_id.substring(0, 8).toUpperCase()}
                    </p>
                    <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', margin: '0.25rem 0' }}>
                      {item.product_name}
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>SKU: {item.sku}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={S.badge(item.item_status)}>{item.item_status}</span>
                    <p style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginTop: '0.5rem' }}>₹{item.subtotal}</p>
                  </div>
                </div>

                <div style={S.grid}>
                  <div>
                    <p style={S.label}>Buyer</p>
                    <p style={S.value}>{item.buyer_phone}</p>
                  </div>
                  <div>
                    <p style={S.label}>Quantity</p>
                    <p style={S.value}>{item.quantity} × ₹{item.price}</p>
                  </div>
                  <div>
                    <p style={S.label}>Payment Method</p>
                    <p style={S.value}>{item.payment_method}</p>
                  </div>
                  <div>
                    <p style={S.label}>Placed At</p>
                    <p style={S.value}>{new Date(item.placed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#475569' }}>
                  📍 {addr.full_name}, {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} – {addr.pincode} | {addr.phone}
                </div>

                {nextStatuses.length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginRight: '0.5rem' }}>Update Status:</span>
                    {nextStatuses.map(ns => (
                      <button
                        key={ns}
                        style={S.actionBtn(ns === 'CANCELLED' ? 'red' : ns === 'SHIPPED' ? 'blue' : 'green')}
                        onClick={() => handleUpdateStatus(item.id, ns)}
                        disabled={updating === item.id}
                      >
                        {ns}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
  );
};

export default SellerOrderListPage;
