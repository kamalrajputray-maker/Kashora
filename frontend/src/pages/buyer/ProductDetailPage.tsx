import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicProductAPI, PublicProductDetail, ProductImage, cartAPI, wishlistAPI } from '../../services/api';
import BuyerLayout from '../../components/BuyerLayout';

const S = {
  container: { padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Outfit', 'Inter', sans-serif" },
  backBtn: { padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#475569', fontSize: '0.85rem', marginBottom: '1.5rem' },
  layout: { display: 'grid', gridTemplateColumns: '1fr 500px', gap: '3rem' },
  gallery: { display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  mainImage: { width: '100%', height: '450px', background: '#f8fafc', borderRadius: '12px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #e2e8f0' },
  thumbnails: { display: 'flex', gap: '0.75rem', overflowX: 'auto' as const, paddingBottom: '0.5rem' },
  thumb: (active: boolean) => ({
    width: '70px', height: '70px', borderRadius: '6px', objectFit: 'cover' as const, border: active ? '2px solid #f43f5e' : '1px solid #e2e8f0', cursor: 'pointer'
  }),
  infoCard: { display: 'flex', flexDirection: 'column' as const, gap: '1.25rem' },
  brand: { fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase' as const, color: '#f43f5e', letterSpacing: '0.05em' },
  title: { fontSize: '1.75rem', fontWeight: '700', color: '#0f172a' },
  category: { fontSize: '0.88rem', color: '#64748b' },
  priceBlock: { background: '#fcfaff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #f3e8ff' },
  priceRow: { display: 'flex', alignItems: 'baseline', gap: '0.75rem' },
  price: { fontSize: '1.75rem', fontWeight: '800', color: '#f43f5e' },
  comparePrice: { fontSize: '1.1rem', color: '#94a3b8', textDecoration: 'line-through' },
  discount: { fontSize: '1rem', fontWeight: '700', color: '#10b981' },
  taxNote: { fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.4rem' },
  variantsBlock: { borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' },
  subTitle: { fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.75rem' },
  variantChips: { display: 'flex', gap: '0.6rem', flexWrap: 'wrap' as const },
  chip: (selected: boolean) => ({
    padding: '0.5rem 1rem', borderRadius: '8px', border: selected ? '2px solid #f43f5e' : '1px solid #e2e8f0', background: selected ? '#fff1f2' : '#fff', color: selected ? '#f43f5e' : '#475569', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem'
  }),
  stockBadge: (inStock: boolean) => ({
    background: inStock ? '#d1fae5' : '#fee2e2',
    color: inStock ? '#065f46' : '#991b1b',
    padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700', display: 'inline-block'
  }),
  sellerCard: { background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '1.5rem' },
  desc: { color: '#475569', fontSize: '0.92rem', lineHeight: '1.6' },
  policyRow: { display: 'flex', gap: '1.5rem', background: '#fafbff', padding: '1rem', borderRadius: '8px', border: '1.5px solid #eef2ff', marginTop: '1rem', fontSize: '0.82rem', color: '#4f46e5' }
};

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<PublicProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    publicProductAPI.get(slug)
      .then(res => {
        setProduct(res.data);
        if (res.data.images.length > 0) {
          const primary = res.data.images.find(img => img.is_primary);
          setActiveImage(primary ? primary.image : res.data.images[0].image);
        }
        if (res.data.variants.length > 0) {
          setSelectedVariantId(res.data.variants[0].id);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAddToCart = () => {
    if (!selectedVariantId) {
      alert('Please select a variant option first.');
      return;
    }
    cartAPI.add(selectedVariantId, 1)
      .then(() => {
        alert('Product added to shopping cart!');
        navigate('/cart');
      })
      .catch(err => {
        alert(err.response?.data?.quantity || 'Failed to add item to cart.');
      });
  };

  const handleAddToWishlist = () => {
    if (!selectedVariantId) {
      alert('Please select a variant option first.');
      return;
    }
    wishlistAPI.add(selectedVariantId)
      .then(() => {
        alert('Product added to wishlist!');
        navigate('/wishlist');
      })
      .catch(err => {
        alert(err.response?.data?.detail || 'Failed to add item to wishlist.');
      });
  };

  if (loading) {
    return (
      <BuyerLayout>
        <div style={S.container}>Loading product details...</div>
      </BuyerLayout>
    );
  }

  if (!product) {
    return (
      <BuyerLayout>
        <div style={S.container}>
          <button style={S.backBtn} onClick={() => navigate('/products')}>← Back</button>
          <p>Product not found.</p>
        </div>
      </BuyerLayout>
    );
  }

  // Calculate selected variant pricing / details
  const selectedVariant = product.variants.find(v => v.id === selectedVariantId);
  const currentPrice = selectedVariant ? selectedVariant.price : product.base_price;
  const currentComparePrice = selectedVariant ? selectedVariant.compare_at_price : product.compare_at_price;
  const inStock = selectedVariant ? selectedVariant.in_stock : product.in_stock;
  const qtyAvailable = selectedVariant ? selectedVariant.available_quantity : 0;
  
  const discountPct = currentComparePrice ? Math.round(((Number(currentComparePrice) - Number(currentPrice)) / Number(currentComparePrice)) * 100) : 0;

  return (
    <BuyerLayout>
      <div style={S.container}>
        <button style={S.backBtn} onClick={() => navigate('/products')}>← Back to Catalog</button>
        
        <div style={S.layout}>
          {/* Left: Gallery */}
          <div style={S.gallery}>
            <div style={S.mainImage}>
              {activeImage ? (
                <img src={activeImage} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '4rem' }}>🛍️</span>
              )}
            </div>
            <div style={S.thumbnails}>
              {product.images.map(img => (
                <img
                  key={img.id}
                  src={img.image}
                  alt={img.alt_text}
                  style={S.thumb(activeImage === img.image)}
                  onClick={() => setActiveImage(img.image)}
                />
              ))}
            </div>
          </div>

          {/* Right: Info */}
          <div style={S.infoCard}>
            <div>
              <span style={S.brand}>{product.brand}</span>
              <h1 style={S.title}>{product.name}</h1>
              <span style={S.category}>Category: <strong>{product.category_name}</strong></span>
            </div>

            <div style={S.priceBlock}>
              <div style={S.priceRow}>
                <span style={S.price}>₹{currentPrice}</span>
                {currentComparePrice && (
                  <>
                    <span style={S.comparePrice}>₹{currentComparePrice}</span>
                    <span style={S.discount}>{discountPct}% OFF</span>
                  </>
                )}
              </div>
              <p style={S.taxNote}>inclusive of all taxes (GST {product.tax_percentage}%)</p>
            </div>

            {/* Variants selection */}
            {product.variants.length > 0 && (
              <div style={S.variantsBlock}>
                <h4 style={S.subTitle}>Select Size/Color Option</h4>
                <div style={S.variantChips}>
                  {product.variants.map(v => (
                    <button
                      key={v.id}
                      style={S.chip(selectedVariantId === v.id)}
                      onClick={() => setSelectedVariantId(v.id)}
                    >
                      {v.attribute_summary}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Availability */}
            <div style={{ marginTop: '0.5rem' }}>
              <span style={S.stockBadge(inStock)}>
                {inStock ? `In Stock (Only ${qtyAvailable} left)` : 'Out of Stock'}
              </span>
            </div>

            {/* Action Buttons: Add to Cart and Wishlist */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                style={{
                  flex: 1, padding: '0.85rem', border: 'none', background: inStock ? '#f43f5e' : '#cbd5e1', color: '#fff',
                  borderRadius: '8px', cursor: inStock ? 'pointer' : 'not-allowed', fontWeight: '700', fontSize: '1rem'
                }}
                onClick={handleAddToCart}
                disabled={!inStock}
              >
                {inStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
              <button
                style={{
                  padding: '0.85rem 1.5rem', border: '1px solid #cbd5e1', background: '#fff',
                  color: '#475569', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem'
                }}
                onClick={handleAddToWishlist}
              >
                ❤️ Wishlist
              </button>
            </div>

            {/* Product Description */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
              <h4 style={S.subTitle}>Product Description</h4>
              <p style={S.desc}>{product.description}</p>
            </div>

            {/* Return & Shipping Badges */}
            <div style={S.policyRow}>
              <span>🚚 Shipping: ₹{product.shipping_charge}</span>
              <span>↩️ {product.returnable ? `Return window: ${product.return_window_days} days` : 'Non-Returnable'}</span>
            </div>

            {/* Seller / Store details */}
            <div style={S.sellerCard}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Sold By</span>
              <h5 style={{ fontSize: '0.98rem', fontWeight: '700', color: '#1e293b', marginTop: '0.2rem' }}>🏡 {product.seller_store}</h5>
            </div>
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
};

export default ProductDetailPage;
