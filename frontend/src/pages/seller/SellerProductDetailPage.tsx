import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { sellerProductAPI, Product } from '../../services/api';
import '../../styles/seller.css';

const badgeClass = (val: string) => `badge badge-${val.toLowerCase()}`;

const SellerProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    sellerProductAPI.get(id)
      .then(r => setProduct(r.data))
      .catch(() => setError('Product not found or you do not have access.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!id) return;
    if (!window.confirm('Submit this product for admin review?')) return;
    setSubmitting(true);
    try {
      await sellerProductAPI.submit(id);
      setSubmitMsg('✅ Product submitted for review!');
      setProduct(prev => prev ? { ...prev, approval_status: 'PENDING' } : prev);
    } catch (err: any) {
      setSubmitMsg(`❌ ${err.response?.data?.detail || 'Submit failed.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <div className="loading-container">Loading product…</div>;
  if (error || !product) return (
    <div className="product-detail-container">
      <div className="alert alert-error">{error || 'Product not found.'}</div>
      <button className="btn btn-secondary" onClick={() => navigate('/seller/products')}>← Back</button>
    </div>
  );

  return (
    <div className="product-detail-container">
      <div className="product-detail-header">
        <div>
          <h1>{product.name}</h1>
          <div className="badges">
            <span className={badgeClass(product.status)}>{product.status}</span>
            <span className={badgeClass(product.approval_status)}>{product.approval_status}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/seller/products')}>← Back</button>
          <Link to={`/seller/products/${product.id}/edit`} className="btn btn-primary">✏️ Edit</Link>
          {(product.approval_status === 'PENDING' || product.approval_status === 'APPROVED') ? null : (
            <button className="btn btn-success" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : '🚀 Submit for Review'}
            </button>
          )}
        </div>
      </div>

      {submitMsg && <div className={`alert ${submitMsg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{submitMsg}</div>}

      {/* Rejection notice */}
      {product.approval_status === 'REJECTED' && product.rejection_reason && (
        <div className="rejection-banner">
          <strong>⚠️ Rejected by Admin</strong>
          <p>{product.rejection_reason}</p>
        </div>
      )}

      {/* Basic Info */}
      <div className="detail-section">
        <h2>Basic Information</h2>
        <div className="detail-grid">
          <div className="detail-item"><label>Brand</label><p>{product.brand}</p></div>
          <div className="detail-item"><label>Category</label><p>{product.category_name}</p></div>
          <div className="detail-item"><label>Slug</label><p>{product.slug}</p></div>
          <div className="detail-item" style={{ gridColumn: '1/-1' }}><label>Description</label><p>{product.description}</p></div>
        </div>
      </div>

      {/* Pricing */}
      <div className="detail-section">
        <h2>Pricing</h2>
        <div className="detail-grid">
          <div className="detail-item"><label>Base Price</label><p>₹{Number(product.base_price).toFixed(2)}</p></div>
          {product.compare_at_price && (
            <div className="detail-item"><label>Compare-At Price</label><p>₹{Number(product.compare_at_price).toFixed(2)}</p></div>
          )}
          <div className="detail-item"><label>Tax</label><p>{product.tax_percentage}%</p></div>
          <div className="detail-item"><label>Shipping Charge</label><p>₹{Number(product.shipping_charge).toFixed(2)}</p></div>
        </div>
      </div>

      {/* Return Policy */}
      <div className="detail-section">
        <h2>Return Policy</h2>
        <div className="detail-grid">
          <div className="detail-item"><label>Returnable</label><p>{product.returnable ? 'Yes' : 'No'}</p></div>
          {product.returnable && <div className="detail-item"><label>Return Window</label><p>{product.return_window_days} days</p></div>}
        </div>
      </div>

      {/* Timestamps */}
      <div className="detail-section">
        <h2>Timestamps</h2>
        <div className="detail-grid">
          <div className="detail-item"><label>Created</label><p>{new Date(product.created_at).toLocaleString()}</p></div>
          <div className="detail-item"><label>Last Updated</label><p>{new Date(product.updated_at).toLocaleString()}</p></div>
        </div>
      </div>
    </div>
  );
};

export default SellerProductDetailPage;
