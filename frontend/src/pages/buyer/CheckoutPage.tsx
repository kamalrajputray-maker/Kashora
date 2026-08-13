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

  if (!cartData) return <BuyerLayout><div style={S.container}>Loading checkout...</div></BuyerLayout>;

  const shippingFee = cartData.items.length > 0 ? 40 : 0;
  const grandTotal = Number(cartData.total_price) + shippingFee;

  return (
    <BuyerLayout>
      <div style={S.container}>
        <h1 style={S.title}>Checkout</h1>

        {/* Shipping Address */}
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Shipping Address</h3>
          <div style={S.fieldRow}>
            <div style={S.field}>
              <label style={S.label}>Full Name *</label>
              <input style={S.input} name="full_name" value={form.full_name} onChange={handleChange} placeholder="Enter full name" />
            </div>
            <div style={S.field}>
              <label style={S.label}>Phone Number *</label>
              <input style={S.input} name="phone" value={form.phone} onChange={handleChange} placeholder="10-digit phone" />
            </div>
          </div>
          <div style={{ ...S.field, marginBottom: '1rem' }}>
            <label style={S.label}>Address Line 1 *</label>
            <input style={S.input} name="line1" value={form.line1} onChange={handleChange} placeholder="House No., Street, Area" />
          </div>
          <div style={{ ...S.field, marginBottom: '1rem' }}>
            <label style={S.label}>Address Line 2 (Optional)</label>
            <input style={S.input} name="line2" value={form.line2} onChange={handleChange} placeholder="Landmark, Locality" />
          </div>
          <div style={S.fieldRow}>
            <div style={S.field}>
              <label style={S.label}>City *</label>
              <input style={S.input} name="city" value={form.city} onChange={handleChange} placeholder="City" />
            </div>
            <div style={S.field}>
              <label style={S.label}>State *</label>
              <input style={S.input} name="state" value={form.state} onChange={handleChange} placeholder="State" />
            </div>
            <div style={{ ...S.field, maxWidth: '130px' }}>
              <label style={S.label}>Pincode *</label>
              <input style={S.input} name="pincode" value={form.pincode} onChange={handleChange} placeholder="6-digit" maxLength={6} />
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Payment Method</h3>
          <div style={S.fieldRow}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="radio" name="payment_method" value="COD" checked={form.payment_method === 'COD'} onChange={handleChange} />
              Cash on Delivery (COD)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.5 }}>
              <input type="radio" name="payment_method" value="PREPAID" disabled />
              Online Payment (Coming Soon)
            </label>
          </div>
        </div>

        {/* Order Notes */}
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Order Notes (Optional)</h3>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            style={{ ...S.input, width: '100%', resize: 'vertical', height: '80px' }}
            placeholder="Special instructions for delivery..."
          />
        </div>

        {/* Order Summary */}
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Order Summary</h3>
          {cartData.items.map((item: any) => (
            <div key={item.id} style={S.summaryRow}>
              <span>{item.product_name} × {item.quantity}</span>
              <span>₹{item.subtotal}</span>
            </div>
          ))}
          <div style={S.summaryRow}>
            <span>Subtotal</span>
            <span>₹{cartData.total_price}</span>
          </div>
          <div style={S.summaryRow}>
            <span>Shipping</span>
            <span>₹{shippingFee}</span>
          </div>
          <div style={S.totalRow}>
            <span>Total to Pay</span>
            <span>₹{grandTotal}</span>
          </div>

          {error && <div style={S.errorMsg}>⚠️ {error}</div>}

          <button
            style={{ ...S.placeBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
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
