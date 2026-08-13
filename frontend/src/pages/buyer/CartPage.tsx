import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { cartAPI, Cart } from '../../services/api';
import BuyerLayout from '../../components/BuyerLayout';

const S = {
  container: { padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: "'Outfit', 'Inter', sans-serif" },
  card: { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', padding: '1.5rem', display: 'flex', flexDirection: 'column' as const, gap: '1.5rem' },
  title: { fontSize: '1.75rem', fontWeight: '700', color: '#1e293b', marginBottom: '1.5rem' },
  itemRow: { display: 'flex', gap: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.5rem', alignItems: 'center' },
  image: { width: '90px', height: '90px', objectFit: 'cover' as const, borderRadius: '6px', background: '#f8fafc' },
  info: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '0.3rem' },
  name: { fontSize: '1rem', fontWeight: '600', color: '#1e293b', textDecoration: 'none' },
  sku: { fontSize: '0.8rem', color: '#64748b' },
  price: { fontSize: '1.05rem', fontWeight: '700', color: '#f43f5e' },
  qtyContainer: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  qtyBtn: { width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  qtyInput: { width: '45px', height: '32px', textAlign: 'center' as const, border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' },
  subtotal: { fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', width: '120px', textAlign: 'right' as const },
  removeBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.25rem', padding: '0.25rem', display: 'flex', alignSelf: 'center' },
  summaryCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  checkoutBtn: { background: '#f43f5e', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.75rem 2rem', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' },
  emptyContainer: { textAlign: 'center' as const, padding: '4rem 2rem' }
};

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = () => {
    cartAPI.get()
      .then(res => setCart(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleUpdateQty = (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    setLoading(true);
    cartAPI.updateItem(itemId, newQty)
      .then(res => setCart(res.data))
      .catch(err => {
        alert(err.response?.data?.quantity || 'Unable to update stock quantity.');
      })
      .finally(() => setLoading(false));
  };

  const handleRemoveItem = (itemId: string) => {
    setLoading(true);
    cartAPI.deleteItem(itemId)
      .then(res => setCart(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleClearCart = () => {
    if (!window.confirm('Are you sure you want to empty your cart?')) return;
    setLoading(true);
    cartAPI.clear()
      .then(() => setCart({ id: '', items: [], total_price: 0, created_at: '', updated_at: '' }))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  if (loading && !cart) {
    return (
      <BuyerLayout>
        <div style={S.container}>Loading shopping cart...</div>
      </BuyerLayout>
    );
  }

  const items = cart?.items || [];

  return (
    <BuyerLayout>
      <div style={S.container}>
        <h1 style={S.title}>Shopping Cart</h1>

        {items.length === 0 ? (
          <div style={S.card}>
            <div style={S.emptyContainer}>
              <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>🛒</span>
              <h3 style={{ fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>Your Cart is empty</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Add items to it to get started!</p>
              <Link to="/products" style={{ ...S.checkoutBtn, textDecoration: 'none' }}>Shop Now</Link>
            </div>
          </div>
        ) : (
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600' }} onClick={handleClearCart}>
                Empty Cart
              </button>
            </div>

            {items.map(item => (
              <div key={item.id} style={S.itemRow}>
                {item.primary_image ? (
                  <img src={item.primary_image} alt={item.product_name} style={S.image} />
                ) : (
                  <div style={{ ...S.image, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontSize: '2rem' }}>🛍️</div>
                )}
                
                <div style={S.info}>
                  <Link to={`/products/${item.product_slug}`} style={S.name}>{item.product_name}</Link>
                  <span style={S.sku}>SKU: {item.sku}</span>
                  <span style={S.price}>₹{item.price}</span>
                </div>

                <div style={S.qtyContainer}>
                  <button style={S.qtyBtn} onClick={() => handleUpdateQty(item.id, item.quantity - 1)}>-</button>
                  <input style={S.qtyInput} readOnly value={item.quantity} />
                  <button style={S.qtyBtn} onClick={() => handleUpdateQty(item.id, item.quantity + 1)}>+</button>
                </div>

                <div style={S.subtotal}>
                  ₹{item.subtotal}
                </div>

                <button style={S.removeBtn} onClick={() => handleRemoveItem(item.id)}>×</button>
              </div>
            ))}

            <div style={S.summaryCard}>
              <div>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Cart Total Subtotal</span>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', marginTop: '0.2rem' }}>₹{cart?.total_price || 0}</h2>
              </div>
              <button
                style={S.checkoutBtn}
                onClick={() => alert('Order checkout flow is under development (Phase 4).')}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </BuyerLayout>
  );
};

export default CartPage;
