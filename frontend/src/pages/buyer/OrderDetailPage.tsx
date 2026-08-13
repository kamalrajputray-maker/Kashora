import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { orderAPI, Order } from '../../services/api';
import BuyerLayout from '../../components/BuyerLayout';

const STATUS_CONFIG: Record<string, { bg: string; color: string }> = {
  PENDING:   { bg: '#fef3c7', color: '#92400e' },
  CONFIRMED: { bg: '#dbeafe', color: '#1e40af' },
  SHIPPED:   { bg: '#e0e7ff', color: '#3730a3' },
  DELIVERED: { bg: '#d1fae5', color: '#065f46' },
  CANCELLED: { bg: '#fee2e2', color: '#991b1b' },
};

const STEPS = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

const S = {
  container: { padding: '2rem', maxWidth: '900px', margin: '0 auto', fontFamily: "'Outfit', 'Inter', sans-serif" },
  successBanner: { background: '#d1fae5', color: '#065f46', borderRadius: '8px', padding: '1rem 1.5rem', marginBottom: '1.5rem', fontWeight: '600', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  card: { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem' },
  sectionTitle: { fontSize: '1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #f8fafc' },
  badge: (status: string) => {
    const cfg = STATUS_CONFIG[status] || { bg: '#f1f5f9', color: '#64748b' };
    return { background: cfg.bg, color: cfg.color, padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' };
  },
  addrText: { fontSize: '0.88rem', color: '#475569', lineHeight: '1.7' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569', padding: '0.35rem 0' },
  totalRow: { display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', padding: '0.75rem 0', borderTop: '2px solid #f1f5f9' },
  cancelBtn: { padding: '0.6rem 1.25rem', border: '1px solid #e2e8f0', background: '#fff', color: '#ef4444', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.88rem' },
  backBtn: { padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#475569', fontSize: '0.85rem', marginBottom: '1.5rem' },
  tracker: { display: 'flex', alignItems: 'center', gap: 0, marginBottom: '0.5rem' },
  stepDot: (active: boolean, done: boolean) => ({
    width: '28px', height: '28px', borderRadius: '50%',
    background: done ? '#f43f5e' : active ? '#fecdd3' : '#f1f5f9',
    border: active ? '2px solid #f43f5e' : '2px solid #e2e8f0',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.7rem', fontWeight: '700',
    color: done ? '#fff' : active ? '#f43f5e' : '#94a3b8',
    flexShrink: 0
  }),
  stepLine: (done: boolean) => ({
    flex: 1, height: '2px', background: done ? '#f43f5e' : '#e2e8f0'
  }),
};

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const justPlaced = (location.state as any)?.orderPlaced;

  useEffect(() => {
    if (!id) return;
    orderAPI.get(id)
      .then(res => setOrder(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = () => {
    if (!id || !window.confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    orderAPI.cancel(id)
      .then(res => setOrder(res.data))
      .catch(err => alert(err.response?.data?.detail || 'Failed to cancel order.'))
      .finally(() => setCancelling(false));
  };

  if (loading) return <BuyerLayout><div style={S.container}>Loading order details...</div></BuyerLayout>;
  if (!order) return <BuyerLayout><div style={S.container}>Order not found.</div></BuyerLayout>;

  const currentStepIdx = STEPS.indexOf(order.status);
  const addr = order.shipping_address;

  return (
    <BuyerLayout>
      <div style={S.container}>
        <button style={S.backBtn} onClick={() => navigate('/orders')}>← My Orders</button>

        {justPlaced && (
          <div style={S.successBanner}>
            ✅ Your order has been placed successfully!
          </div>
        )}

        {/* Order Status Tracker */}
        {order.status !== 'CANCELLED' && (
          <div style={S.card}>
            <h3 style={S.sectionTitle}>Order Status</h3>
            <div style={S.tracker}>
              {STEPS.map((step, idx) => (
                <React.Fragment key={step}>
                  <div style={S.stepDot(currentStepIdx === idx, currentStepIdx > idx)}>
                    {currentStepIdx > idx ? '✓' : idx + 1}
                  </div>
                  {idx < STEPS.length - 1 && <div style={S.stepLine(currentStepIdx > idx)} />}
                </React.Fragment>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
              {STEPS.map(step => (
                <span key={step} style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>{step}</span>
              ))}
            </div>
          </div>
        )}

        {/* Order Header */}
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '600', marginBottom: '0.25rem' }}>
                Order #{order.id.substring(0, 8).toUpperCase()}
              </p>
              <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
                Placed on {new Date(order.placed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={S.badge(order.status)}>{order.status}</span>
              <span style={S.badge(order.payment_status)}>{order.payment_status}</span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Items ({order.items.length})</h3>
          {order.items.map(item => (
            <div key={item.id} style={S.itemRow}>
              <div>
                <p style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e293b' }}>{item.product_name}</p>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>SKU: {item.sku} · Qty: {item.quantity}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: '700', color: '#0f172a' }}>₹{item.subtotal}</p>
                <span style={S.badge(item.item_status)}>{item.item_status}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Shipping Address */}
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Delivery Address</h3>
          <p style={S.addrText}>
            <strong>{addr.full_name}</strong><br />
            {addr.phone}<br />
            {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
            {addr.city}, {addr.state} – {addr.pincode}
          </p>
        </div>

        {/* Payment Summary */}
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Payment Summary</h3>
          <div style={S.summaryRow}><span>Subtotal</span><span>₹{order.total_amount}</span></div>
          <div style={S.summaryRow}><span>Shipping</span><span>₹{order.shipping_charge}</span></div>
          {Number(order.discount_amount) > 0 && (
            <div style={{ ...S.summaryRow, color: '#10b981' }}><span>Discount</span><span>-₹{order.discount_amount}</span></div>
          )}
          <div style={S.totalRow}><span>Total</span><span>₹{order.final_amount}</span></div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
            Payment Method: <strong>{order.payment_method === 'COD' ? 'Cash on Delivery' : 'Prepaid'}</strong>
          </p>
        </div>

        {/* Cancel Action */}
        {order.status === 'PENDING' && (
          <div style={{ textAlign: 'right' }}>
            <button style={S.cancelBtn} onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          </div>
        )}
      </div>
    </BuyerLayout>
  );
};

export default OrderDetailPage;
