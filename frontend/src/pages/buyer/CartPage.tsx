import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { cartAPI, Cart } from '../../services/api';
import BuyerLayout from '../../components/BuyerLayout';

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
        <div className="byr-container">Loading shopping cart...</div>
      </BuyerLayout>
    );
  }

  const items = cart?.items || [];

  return (
    <BuyerLayout>
      <div className="byr-container">
        <h1 className="byr-title">Shopping Cart</h1>

        {items.length === 0 ? (
          <div className="byr-empty">
            <span className="byr-empty-icon">🛒</span>
            <h3 className="byr-empty-title">Your Cart is empty</h3>
            <p className="byr-empty-desc">Add items to it to get started!</p>
            <Link to="/products" className="byr-btn byr-btn--primary">Shop Now</Link>
          </div>
        ) : (
          <div className="byr-cart-layout">
            <div className="byr-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="byr-section-title" style={{ marginBottom: 0 }}>Items ({items.length})</h3>
                <button className="byr-btn byr-btn--ghost" onClick={handleClearCart}>
                  Empty Cart
                </button>
              </div>

              {items.map(item => (
                <div key={item.id} className="byr-cart-item">
                  {item.primary_image ? (
                    <img src={item.primary_image} alt={item.product_name} className="byr-cart-img" />
                  ) : (
                    <div className="byr-cart-img">🛍️</div>
                  )}
                  
                  <div className="byr-cart-info">
                    <Link to={`/products/${item.product_slug}`} className="byr-cart-name">{item.product_name}</Link>
                    <span className="byr-cart-sku">SKU: {item.sku}</span>
                    <span className="byr-cart-price">₹{item.price}</span>
                  </div>

                  <div className="byr-cart-qty-wrap">
                    <button className="byr-cart-qty-btn" onClick={() => handleUpdateQty(item.id, item.quantity - 1)}>-</button>
                    <input className="byr-cart-qty-input" readOnly value={item.quantity} />
                    <button className="byr-cart-qty-btn" onClick={() => handleUpdateQty(item.id, item.quantity + 1)}>+</button>
                  </div>

                  <div className="byr-cart-subtotal">
                    ₹{item.subtotal}
                  </div>

                  <button className="byr-btn byr-btn--ghost" style={{ fontSize: '1.25rem', padding: '4px' }} onClick={() => handleRemoveItem(item.id)}>×</button>
                </div>
              ))}
            </div>

            <div className="byr-summary">
              <h3 className="byr-section-title" style={{ marginBottom: 0 }}>Order Summary</h3>
              <div className="byr-summary-row">
                <span>Items ({items.reduce((acc, item) => acc + item.quantity, 0)})</span>
                <span>₹{cart?.total_price || 0}</span>
              </div>
              <div className="byr-summary-row">
                <span>Shipping</span>
                <span style={{ color: 'var(--badge-green-txt)' }}>Free</span>
              </div>
              <div className="byr-summary-row byr-summary-row--total">
                <span>Total</span>
                <span>₹{cart?.total_price || 0}</span>
              </div>
              <button
                className="byr-btn byr-btn--primary"
                style={{ width: '100%', marginTop: '8px' }}
                onClick={() => navigate('/checkout')}
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
