import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { orderAPI, OrderListItem } from '../../services/api';
import BuyerLayout from '../../components/BuyerLayout';

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:   { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  CONFIRMED: { bg: '#dbeafe', color: '#1e40af', label: 'Confirmed' },
  SHIPPED:   { bg: '#e0e7ff', color: '#3730a3', label: 'Shipped' },
  DELIVERED: { bg: '#d1fae5', color: '#065f46', label: 'Delivered' },
  CANCELLED: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  RETURNED:  { bg: '#f3f4f6', color: '#374151', label: 'Returned' },
};

const S = {
  container: { padding: '2rem', maxWidth: '900px', margin: '0 auto', fontFamily: "'Outfit', 'Inter', sans-serif" },
  title: { fontSize: '1.75rem', fontWeight: '700', color: '#1e293b', marginBottom: '1.5rem' },
  card: {
    background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
    padding: '1.25rem 1.5rem', marginBottom: '1rem',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: '1rem', cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    textDecoration: 'none', color: 'inherit'
  },
  orderInfo: { display: 'flex', flexDirection: 'column' as const, gap: '0.3rem' },
  orderId: { fontSize: '0.78rem', color: '#94a3b8', fontWeight: '600' },
  productName: { fontSize: '0.95rem', fontWeight: '600', color: '#1e293b' },
  meta: { fontSize: '0.82rem', color: '#64748b' },
  right: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: '0.5rem' },
  amount: { fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' },
  badge: (status: string) => {
    const cfg = STATUS_CONFIG[status] || { bg: '#f1f5f9', color: '#64748b' };
    return { background: cfg.bg, color: cfg.color, padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' };
  },
  emptyCard: { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '4rem 2rem', textAlign: 'center' as const }
};

export const OrderListPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderAPI.list()
      .then(res => setOrders(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <BuyerLayout><div style={S.container}>Loading orders...</div></BuyerLayout>;
  }

  return (
    <BuyerLayout>
      <div style={S.container}>
        <h1 style={S.title}>My Orders</h1>

        {orders.length === 0 ? (
          <div style={S.emptyCard}>
            <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>📦</span>
            <h3 style={{ fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>No orders yet</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Looks like you haven't ordered anything yet.</p>
            <Link to="/products" style={{ background: '#f43f5e', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.75rem 2rem', fontWeight: '700', textDecoration: 'none', display: 'inline-block' }}>
              Shop Now
            </Link>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} style={S.card} onClick={() => navigate(`/orders/${order.id}`)}>
              <div style={S.orderInfo}>
                <span style={S.orderId}>Order #{order.id.substring(0, 8).toUpperCase()}</span>
                <span style={S.productName}>{order.first_item_name}{order.item_count > 1 ? ` + ${order.item_count - 1} more` : ''}</span>
                <span style={S.meta}>
                  {new Date(order.placed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}{order.payment_method}
                </span>
              </div>
              <div style={S.right}>
                <span style={S.amount}>₹{order.final_amount}</span>
                <span style={S.badge(order.status)}>{STATUS_CONFIG[order.status]?.label || order.status}</span>
                <span style={{ ...S.badge(order.payment_status), fontSize: '0.7rem' }}>
                  {order.payment_status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </BuyerLayout>
  );
};

export default OrderListPage;
