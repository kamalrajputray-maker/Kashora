import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI, cartAPI, CheckoutPayload, ShippingAddress } from '../../services/api';
import BuyerLayout from '../../components/BuyerLayout';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: '#fef3c7', color: '#92400e' },
  CONFIRMED: { bg: '#dbeafe', color: '#1e40af' },
  SHIPPED: { bg: '#e0e7ff', color: '#3730a3' },
  DELIVERED: { bg: '#d1fae5', color: '#065f46' },
  CANCELLED: { bg: '#fee2e2', color: '#991b1b' },
};

const S = {
  container: { padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: "'Outfit', 'Inter', sans-serif" },
  title: { fontSize: '1.75rem', fontWeight: '700', color: '#1e293b', marginBottom: '1.5rem' },
  card: { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '2rem', marginBottom: '1.5rem' },
  sectionTitle: { fontSize: '1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' },
  fieldRow: { display: 'flex', gap: '1rem', marginBottom: '1rem' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: '0.35rem', flex: 1 },
  label: { fontSize: '0.82rem', fontWeight: '600', color: '#64748b' },
  input: { padding: '0.6rem 0.85rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' },
  select: { padding: '0.6rem 0.85rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.9rem', background: '#fff', cursor: 'pointer' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569', padding: '0.4rem 0' },
  totalRow: { display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', padding: '0.75rem 0', borderTop: '2px solid #f1f5f9', marginTop: '0.5rem' },
  placeBtn: { width: '100%', padding: '1rem', background: '#f43f5e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', marginTop: '1rem' },
  errorMsg: { color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem', padding: '0.5rem', background: '#fef2f2', borderRadius: '6px' },
};

interface FormData {
  full_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  payment_method: 'COD' | 'PREPAID';
  notes: string;
}

const INITIAL_FORM: FormData = {
  full_name: '', phone: '', line1: '', line2: '',
  city: '', state: '', pincode: '',
  payment_method: 'COD', notes: ''
};

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [cartData, setCartData] = useState<any>(null);
  const [error, setError] = useState('');

  React.useEffect(() => {
    cartAPI.get()
      .then(res => {
        if (res.data.items.length === 0) {
          navigate('/cart');
        } else {
          setCartData(res.data);
        }
      })
      .catch(() => navigate('/cart'));
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = () => {
    const { full_name, phone, line1, city, state, pincode, payment_method, notes } = form;
    if (!full_name || !phone || !line1 || !city || !state || !pincode) {
      setError('Please fill in all required shipping address fields.');
      return;
    }
    setError('');
    setLoading(true);

    const payload: CheckoutPayload = {
      payment_method,
      shipping_address: { full_name, phone, line1, line2: form.line2, city, state, pincode },
      notes,
    };

    orderAPI.checkout(payload)
      .then(res => {
        navigate(`/orders/${res.data.id}`, { state: { orderPlaced: true } });
      })
      .catch(err => {
        setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
      })
      .finally(() => setLoading(false));
  };

  if (!cartData) return <BuyerLayout><div className="byr-container">Loading checkout...</div></BuyerLayout>;

  const shippingFee = cartData.items.length > 0 ? 40 : 0;
  const grandTotal = Number(cartData.total_price) + shippingFee;

  return (
    <BuyerLayout>
      <div className="byr-container" style={{ maxWidth: '800px' }}>
        <h1 className="byr-title">Checkout</h1>

        {/* Shipping Address */}
        <div className="byr-box">
          <h3 className="byr-section-title">Shipping Address</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="byr-form-group" style={{ flex: '1 1 200px' }}>
              <label className="byr-label">Full Name *</label>
              <input className="byr-input" name="full_name" value={form.full_name} onChange={handleChange} placeholder="Enter full name" />
            </div>
            <div className="byr-form-group" style={{ flex: '1 1 200px' }}>
              <label className="byr-label">Phone Number *</label>
              <input className="byr-input" name="phone" value={form.phone} onChange={handleChange} placeholder="10-digit phone" />
            </div>
          </div>
          <div className="byr-form-group">
            <label className="byr-label">Address Line 1 *</label>
            <input className="byr-input" name="line1" value={form.line1} onChange={handleChange} placeholder="House No., Street, Area" />
          </div>
          <div className="byr-form-group">
            <label className="byr-label">Address Line 2 (Optional)</label>
            <input className="byr-input" name="line2" value={form.line2} onChange={handleChange} placeholder="Landmark, Locality" />
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="byr-form-group" style={{ flex: '1 1 150px' }}>
              <label className="byr-label">City *</label>
              <input className="byr-input" name="city" value={form.city} onChange={handleChange} placeholder="City" />
            </div>
            <div className="byr-form-group" style={{ flex: '1 1 150px' }}>
              <label className="byr-label">State *</label>
              <input className="byr-input" name="state" value={form.state} onChange={handleChange} placeholder="State" />
            </div>
            <div className="byr-form-group" style={{ flex: '0 1 130px' }}>
              <label className="byr-label">Pincode *</label>
              <input className="byr-input" name="pincode" value={form.pincode} onChange={handleChange} placeholder="6-digit" maxLength={6} />
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="byr-box">
          <h3 className="byr-section-title">Payment Method</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '1rem', color: 'var(--byr-text-1)', fontWeight: 600 }}>
              <input type="radio" name="payment_method" value="COD" checked={form.payment_method === 'COD'} onChange={handleChange} style={{ transform: 'scale(1.2)' }} />
              Cash on Delivery (COD)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'not-allowed', fontSize: '1rem', color: 'var(--byr-text-3)', fontWeight: 600, opacity: 0.6 }}>
              <input type="radio" name="payment_method" value="PREPAID" disabled style={{ transform: 'scale(1.2)' }} />
              Online Payment (Coming Soon)
            </label>
          </div>
        </div>

        {/* Order Notes */}
        <div className="byr-box">
          <h3 className="byr-section-title">Order Notes (Optional)</h3>
          <textarea
            className="byr-input"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            style={{ resize: 'vertical', minHeight: '80px' }}
            placeholder="Special instructions for delivery..."
          />
        </div>

        {/* Order Summary */}
        <div className="byr-box" style={{ background: 'var(--byr-bg)' }}>
          <h3 className="byr-section-title">Order Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cartData.items.map((item: any) => (
              <div key={item.id} className="byr-summary-row" style={{ fontSize: '0.95rem' }}>
                <span style={{ color: 'var(--byr-text-1)' }}>{item.product_name} × {item.quantity}</span>
                <span style={{ fontWeight: 600 }}>₹{item.subtotal}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--byr-card-border)', margin: '8px 0' }} />
            <div className="byr-summary-row">
              <span>Subtotal</span>
              <span style={{ fontWeight: 600 }}>₹{cartData.total_price}</span>
            </div>
            <div className="byr-summary-row">
              <span>Shipping Fee</span>
              <span style={{ fontWeight: 600 }}>₹{shippingFee}</span>
            </div>
            <div className="byr-summary-row byr-summary-row--total" style={{ borderTopStyle: 'solid' }}>
              <span>Total to Pay</span>
              <span>₹{grandTotal}</span>
            </div>
          </div>

          {error && <div style={{ color: 'var(--badge-red-txt)', background: 'var(--badge-red-bg)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}>⚠️ {error}</div>}

          <button
            className="byr-btn byr-btn--primary"
            style={{ width: '100%', marginTop: '16px', padding: '16px' }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Placing Order...' : `Place Order (${form.payment_method})`}
          </button>
        </div>
      </div>
    </BuyerLayout>
  );
};

export default CheckoutPage;
