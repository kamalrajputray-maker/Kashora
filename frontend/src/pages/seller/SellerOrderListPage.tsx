import React, { useState, useEffect } from 'react';
import { sellerOrderAPI, SellerOrderItem } from '../../services/api';

const NEXT_STATUS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
};

const badgeClass = (status: string) => {
  if (status === 'CANCELLED') return 'sp-badge sp-badge--red';
  if (status === 'DELIVERED') return 'sp-badge sp-badge--green';
  if (status === 'SHIPPED')   return 'sp-badge sp-badge--blue';
  if (status === 'PENDING')   return 'sp-badge sp-badge--yellow';
  return 'sp-badge'; // default greyish/blue
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

  const pending = items.filter(i => i.item_status === 'PENDING').length;
  const toShip = items.filter(i => i.item_status === 'CONFIRMED').length;

  return (
    <>
      <div className="sp-header">
        <div>
          <h1 className="sp-header__title">Orders</h1>
          <p className="sp-header__sub">Manage and track your customer orders</p>
        </div>
      </div>

      <div className="sp-stats" style={{ marginBottom: 24 }}>
        <div className="sp-stat-card" style={{ '--card-accent': '#6366f1', '--card-icon-bg': 'rgba(99,102,241,0.1)', '--card-icon-color': '#4f46e5' } as React.CSSProperties}>
          <div className="sp-stat-icon">◈</div>
          <div className="sp-stat-label">Total Orders</div>
          <div className="sp-stat-value">{items.length}</div>
        </div>
        <div className="sp-stat-card" style={{ '--card-accent': '#f59e0b', '--card-icon-bg': 'rgba(245,158,11,0.1)', '--card-icon-color': '#d97706' } as React.CSSProperties}>
          <div className="sp-stat-icon">⏳</div>
          <div className="sp-stat-label">Pending Action</div>
          <div className="sp-stat-value">{pending}</div>
        </div>
        <div className="sp-stat-card" style={{ '--card-accent': '#3b82f6', '--card-icon-bg': 'rgba(59,130,246,0.1)', '--card-icon-color': '#2563eb' } as React.CSSProperties}>
          <div className="sp-stat-icon">📦</div>
          <div className="sp-stat-label">To Ship</div>
          <div className="sp-stat-value">{toShip}</div>
        </div>
      </div>

      {loading ? (
        <div className="sp-loading">Loading orders...</div>
      ) : items.length === 0 ? (
        <div className="sp-empty">
          <span className="sp-empty__icon">🛒</span>
          <span className="sp-empty__text">No orders yet.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map(item => {
            const addr = item.shipping_address;
            const nextStatuses = NEXT_STATUS[item.item_status] || [];
            
            return (
              <div key={item.id} className="sp-card">
                <div className="sp-card__head" style={{ padding: '16px 20px', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--sel-text-muted)', fontWeight: 600, marginBottom: 4 }}>
                      ORDER #{item.order_id.substring(0, 8).toUpperCase()}
                    </div>
                    <div className="sp-card__title" style={{ fontSize: '1.1rem' }}>{item.product_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--sel-text-muted)', marginTop: 4 }}>SKU: {item.sku}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={badgeClass(item.item_status)}>{item.item_status}</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--sel-text-1)', marginTop: 8 }}>
                      ₹{item.subtotal}
                    </div>
                  </div>
                </div>
                
                <div className="sp-card__body" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 16 }}>
                    <div>
                      <div className="sp-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Buyer Phone</div>
                      <div style={{ color: 'var(--sel-text-1)', fontWeight: 500, fontSize: '0.9rem' }}>{item.buyer_phone}</div>
                    </div>
                    <div>
                      <div className="sp-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Quantity</div>
                      <div style={{ color: 'var(--sel-text-1)', fontWeight: 500, fontSize: '0.9rem' }}>{item.quantity} × ₹{item.price}</div>
                    </div>
                    <div>
                      <div className="sp-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Payment</div>
                      <div style={{ color: 'var(--sel-text-1)', fontWeight: 500, fontSize: '0.9rem' }}>{item.payment_method}</div>
                    </div>
                    <div>
                      <div className="sp-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Placed At</div>
                      <div style={{ color: 'var(--sel-text-1)', fontWeight: 500, fontSize: '0.9rem' }}>
                        {new Date(item.placed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--sel-bg)', padding: '12px 16px', borderRadius: 'var(--sel-radius-sm)', fontSize: '0.85rem', color: 'var(--sel-text-2)', border: '1px solid var(--sel-card-border)' }}>
                    <strong>📍 Shipping Address:</strong> {addr.full_name}, {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} – {addr.pincode} | {addr.phone}
                  </div>

                  {nextStatuses.length > 0 && (
                    <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sel-text-muted)' }}>UPDATE STATUS:</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {nextStatuses.map(ns => (
                          <button
                            key={ns}
                            className={`sp-btn ${ns === 'CANCELLED' ? 'sp-btn--ghost' : 'sp-btn--primary'} sp-btn--sm`}
                            onClick={() => handleUpdateStatus(item.id, ns)}
                            disabled={updating === item.id}
                          >
                            Mark as {ns}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default SellerOrderListPage;
