import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { publicProductAPI, categoryAPI, Category, PublicProduct } from '../../services/api';

const S = {
  container: { padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Outfit', 'Inter', sans-serif", display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem' },
  sidebar: { background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: 'fit-content' },
  main: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  searchRow: { display: 'flex', gap: '1rem', alignItems: 'center' },
  input: { padding: '0.6rem 1.25rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', width: '100%' },
  select: { padding: '0.6rem 1.25rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', background: '#fff', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' },
  card: { background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' },
  imageContainer: { width: '100%', height: '240px', background: '#f8fafc', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  img: { width: '100%', height: '100%', objectFit: 'cover' as const },
  cardBody: { padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  brand: { fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' as const, color: '#94a3b8', letterSpacing: '0.05em' },
  name: { fontSize: '0.92rem', fontWeight: '600', color: '#1e293b', lineHeight: '1.4', height: '40px', overflow: 'hidden' },
  priceRow: { display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' },
  price: { fontSize: '1.15rem', fontWeight: '700', color: '#f43f5e' },
  comparePrice: { fontSize: '0.9rem', color: '#94a3b8', textDecoration: 'line-through' },
  discount: { fontSize: '0.82rem', fontWeight: '700', color: '#10b981' },
  badge: (inStock: boolean) => ({
    background: inStock ? '#d1fae5' : '#fee2e2',
    color: inStock ? '#065f46' : '#991b1b',
    padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', alignSelf: 'flex-start'
  }),
  sidebarTitle: { fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' },
  catLink: (active: boolean) => ({
    display: 'block', padding: '0.45rem 0.75rem', borderRadius: '6px', fontSize: '0.88rem', color: active ? '#7c3aed' : '#475569', background: active ? '#f5f3ff' : 'transparent', fontWeight: active ? '600' : 'normal', cursor: 'pointer', marginBottom: '0.25rem'
  }),
  pagination: { display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2.5rem' },
  pageBtn: (active: boolean) => ({
    padding: '0.5rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: active ? '#7c3aed' : '#fff', color: active ? '#fff' : '#475569', fontWeight: '600', cursor: 'pointer'
  })
};

export const ProductListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter & Search states from URL Params
  const query = searchParams.get('search') || '';
  const selectedCatSlug = searchParams.get('category') || '';
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';
  const availability = searchParams.get('availability') || '';
  const ordering = searchParams.get('ordering') || '-created_at';
  const page = Number(searchParams.get('page')) || 1;

  useEffect(() => {
    // Load categories list
    categoryAPI.getCategories().then(res => setCategories(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: any = { page };
    if (query) params.search = query;
    if (selectedCatSlug) params.category_slug = selectedCatSlug;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    if (availability) params.availability = availability;
    if (ordering) params.ordering = ordering;

    publicProductAPI.list(params)
      .then(res => {
        setProducts(res.data.results);
        setTotalCount(res.data.count);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [query, selectedCatSlug, minPrice, maxPrice, availability, ordering, page]);

  const updateParam = (key: string, value: string) => {
    const updated = new URLSearchParams(searchParams);
    if (value) {
      updated.set(key, value);
    } else {
      updated.delete(key);
    }
    updated.set('page', '1'); // reset page on filter change
    setSearchParams(updated);
  };

  const handlePageChange = (p: number) => {
    const updated = new URLSearchParams(searchParams);
    updated.set('page', String(p));
    setSearchParams(updated);
  };

  const totalPages = Math.ceil(totalCount / 20);

  return (
    <div style={S.container}>
      {/* Sidebar Filters */}
      <div style={S.sidebar}>
        <h3 style={S.sidebarTitle}>Categories</h3>
        <span style={S.catLink(!selectedCatSlug)} onClick={() => updateParam('category', '')}>
          All Products
        </span>
        {categories.map(cat => (
          <span key={cat.id} style={S.catLink(selectedCatSlug === cat.slug)} onClick={() => updateParam('category', cat.slug)}>
            {cat.name}
          </span>
        ))}

        <h3 style={{ ...S.sidebarTitle, marginTop: '2rem' }}>Availability</h3>
        <label style={{ display: 'flex', gap: '0.5rem', fontSize: '0.88rem', color: '#475569', marginBottom: '0.5rem', cursor: 'pointer' }}>
          <input type="radio" name="avail" checked={!availability} onChange={() => updateParam('availability', '')} />
          All Items
        </label>
        <label style={{ display: 'flex', gap: '0.5rem', fontSize: '0.88rem', color: '#475569', marginBottom: '0.5rem', cursor: 'pointer' }}>
          <input type="radio" name="avail" checked={availability === 'in_stock'} onChange={() => updateParam('availability', 'in_stock')} />
          In Stock Only
        </label>

        <h3 style={{ ...S.sidebarTitle, marginTop: '2rem' }}>Price Range (₹)</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            style={{ ...S.input, padding: '0.4rem 0.6rem' }}
            placeholder="Min"
            type="number"
            value={minPrice}
            onChange={e => updateParam('min_price', e.target.value)}
          />
          <input
            style={{ ...S.input, padding: '0.4rem 0.6rem' }}
            placeholder="Max"
            type="number"
            value={maxPrice}
            onChange={e => updateParam('max_price', e.target.value)}
          />
        </div>
      </div>

      {/* Main Listing View */}
      <div style={S.main}>
        {/* Search Row */}
        <div style={S.searchRow}>
          <input
            style={S.input}
            placeholder="Search products by brand, details, or store..."
            value={query}
            onChange={e => updateParam('search', e.target.value)}
          />
          <select style={S.select} value={ordering} onChange={e => updateParam('ordering', e.target.value)}>
            <option value="-created_at">Newest First</option>
            <option value="base_price">Price: Low to High</option>
            <option value="-base_price">Price: High to Low</option>
          </select>
        </div>

        {/* Listing Grid */}
        {loading ? (
          <p>Loading products catalog...</p>
        ) : (
          <>
            <div style={S.grid}>
              {products.map(p => {
                const discPct = p.compare_at_price ? Math.round(((Number(p.compare_at_price) - Number(p.base_price)) / Number(p.compare_at_price)) * 100) : 0;
                return (
                  <div key={p.id} style={S.card} onClick={() => navigate(`/products/${p.slug}`)}>
                    <div style={S.imageContainer}>
                      {p.primary_image ? (
                        <img src={p.primary_image} alt={p.name} style={S.img} />
                      ) : (
                        <span style={{ fontSize: '2.5rem' }}>🛍️</span>
                      )}
                    </div>
                    <div style={S.cardBody}>
                      <span style={S.brand}>{p.brand}</span>
                      <h4 style={S.name}>{p.name}</h4>
                      
                      <div style={S.priceRow}>
                        <span style={S.price}>₹{p.base_price}</span>
                        {p.compare_at_price && (
                          <>
                            <span style={S.comparePrice}>₹{p.compare_at_price}</span>
                            <span style={S.discount}>{discPct}% OFF</span>
                          </>
                        )}
                      </div>
                      
                      <span style={S.badge(p.in_stock)}>{p.in_stock ? 'In Stock' : 'Out of Stock'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {products.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🔍</span>
                <p style={{ fontWeight: '600' }}>No products match your search/filter criteria.</p>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={S.pagination}>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pNum => (
                  <button key={pNum} style={S.pageBtn(page === pNum)} onClick={() => handlePageChange(pNum)}>
                    {pNum}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductListPage;
