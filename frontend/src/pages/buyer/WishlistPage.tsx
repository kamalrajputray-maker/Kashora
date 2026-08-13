import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { wishlistAPI, cartAPI, WishlistItem } from '../../services/api';
import BuyerLayout from '../../components/BuyerLayout';

const S = {
  container: { padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Outfit', 'Inter', sans-serif" },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' },
  card: { background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', position: 'relative' as const },
  imageContainer: { width: '100%', height: '240px', background: '#f8fafc', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  img: { width: '100%', height: '100%', objectFit: 'cover' as const },
  cardBody: { padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  name: { fontSize: '0.92rem', fontWeight: '600', color: '#1e293b', lineHeight: '1.4', height: '40px', overflow: 'hidden', textDecoration: 'none' },
  price: { fontSize: '1.15rem', fontWeight: '700', color: '#f43f5e' },
  badge: (inStock: boolean) => ({
    background: inStock ? '#d1fae5' : '#fee2e2',
    color: inStock ? '#065f46' : '#991b1b',
    padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', alignSelf: 'flex-start'
  }),
  btnRow: { display: 'flex', gap: '0.5rem', marginTop: '0.5rem' },
  addBtn: { flex: 1, padding: '0.5rem', border: 'none', background: '#f43f5e', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem' },
  deleteBtn: { width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' },
  title: { fontSize: '1.75rem', fontWeight: '700', color: '#1e293b', marginBottom: '1.5rem' },
  emptyCard: { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '4rem 2rem', textAlign: 'center' as const }
};

export const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = () => {
    wishlistAPI.list()
      .then(res => setItems(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleDelete = (id: string) => {
    wishlistAPI.delete(id)
      .then(() => setItems(prev => prev.filter(item => item.id !== id)))
      .catch(err => console.error(err));
  };

  const handleAddToCart = (item: WishlistItem) => {
    if (!item.in_stock) {
      alert('This item is currently out of stock.');
      return;
    }
    cartAPI.add(item.variant_id, 1)
      .then(() => {
        alert('Item added to cart!');
        navigate('/cart');
      })
      .catch(err => {
        alert(err.response?.data?.quantity || 'Failed to add item to cart.');
      });
  };

  if (loading) {
    return (
      <BuyerLayout>
        <div style={S.container}>Loading wishlist items...</div>
      </BuyerLayout>
    );
  }

  return (
    <BuyerLayout>
      <div style={S.container}>
        <h1 style={S.title}>My Wishlist</h1>

        {items.length === 0 ? (
          <div style={S.emptyCard}>
            <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>💖</span>
            <h3 style={{ fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>Your Wishlist is empty</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Save items you love here!</p>
            <Link to="/products" style={{ ...S.addBtn, padding: '0.75rem 2rem', textDecoration: 'none', display: 'inline-block', width: 'auto' }}>
              Explore Products
            </Link>
          </div>
        ) : (
          <div style={S.grid}>
            {items.map(item => (
              <div key={item.id} style={S.card}>
                <div style={S.imageContainer}>
                  {item.primary_image ? (
                    <img src={item.primary_image} alt={item.product_name} style={S.img} />
                  ) : (
                    <span style={{ fontSize: '2.5rem' }}>🛍️</span>
                  )}
                </div>
                <div style={S.cardBody}>
                  <Link to={`/products/${item.product_slug}`} style={S.name}>{item.product_name}</Link>
                  <span style={S.price}>₹{item.price}</span>
                  <span style={S.badge(item.in_stock)}>{item.in_stock ? 'In Stock' : 'Out of Stock'}</span>
                  
                  <div style={S.btnRow}>
                    <button style={S.addBtn} onClick={() => handleAddToCart(item)}>Add to Cart</button>
                    <button style={S.deleteBtn} onClick={() => handleDelete(item.id)}>×</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BuyerLayout>
  );
};

export default WishlistPage;
