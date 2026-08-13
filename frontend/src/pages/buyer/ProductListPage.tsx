import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { publicProductAPI, categoryAPI, Category, PublicProduct } from '../../services/api';
import BuyerLayout from '../../components/BuyerLayout';

const S = {
  container: { padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Outfit', 'Inter', sans-serif", display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem' },
  sidebar: { background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: 'fit-content', border: '1px solid #f1f5f9' },
  main: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' },
  card: { background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' },
  imageContainer: { width: '100%', height: '220px', background: '#f8fafc', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  img: { width: '100%', height: '100%', objectFit: 'cover' as const },
  cardBody: { padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  brand: { fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase' as const, color: '#94a3b8', letterSpacing: '0.05em' },
  name: { fontSize: '0.9rem', fontWeight: '600', color: '#1e293b', lineHeight: '1.4', height: '40px', overflow: 'hidden' },
  priceRow: { display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' },
  price: { fontSize: '1.1rem', fontWeight: '700', color: '#f43f5e' },
  comparePrice: { fontSize: '0.85rem', color: '#94a3b8', textDecoration: 'line-through' },
  discount: { fontSize: '0.8rem', fontWeight: '700', color: '#10b981' },
  badge: (inStock: boolean) => ({
    background: inStock ? '#d1fae5' : '#fee2e2',
    color: inStock ? '#065f46' : '#991b1b',
    padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700', alignSelf: 'flex-start'
  }),
  sidebarTitle: { fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' },
  catLink: (active: boolean) => ({
    display: 'block', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem', color: active ? '#f43f5e' : '#475569', background: active ? '#fff1f2' : 'transparent', fontWeight: active ? '600' : 'normal', cursor: 'pointer', marginBottom: '0.2rem'
  }),
  pagination: { display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2.5rem' },
  pageBtn: (active: boolean) => ({
    padding: '0.5rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: active ? '#f43f5e' : '#fff', color: active ? '#fff' : '#475569', fontWeight: '600', cursor: 'pointer'
  }),
  input: { padding: '0.5rem 0.85rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem', width: '100%' },
  select: { padding: '0.5rem 0.85rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', cursor: 'pointer' },
  chip: { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#f1f5f9', color: '#475569', padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', marginRight: '0.5rem', marginBottom: '0.5rem' },
  chipRemove: { cursor: 'pointer', color: '#94a3b8', fontSize: '1rem', lineBreak: 'anywhere' as const },
  clearAll: { background: 'none', border: 'none', color: '#f43f5e', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', padding: '0.35rem 0.75rem' }
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

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const handlePageChange = (p: number) => {
    const updated = new URLSearchParams(searchParams);
    updated.set('page', String(p));
    setSearchParams(updated);
  };

  const totalPages = Math.ceil(totalCount / 20);

  // Find category name by slug
  const getSelectedCategoryName = () => {
    if (!selectedCatSlug) return '';
    const findInTree = (cats: Category[]): string => {
      for (const c of cats) {
        if (c.slug === selectedCatSlug) return c.name;
        if (c.children) {
          const found = findInTree(c.children);
          if (found) return found;
        }
      }
      return '';
    };
    return findInTree(categories) || selectedCatSlug;
  };

  return (
    <BuyerLayout
      initialSearchVal={query}
      onSearch={term => updateParam('search', term)}
    >
      <div style={S.container}>
        {/* Sidebar Filters */}
        <div style={S.sidebar}>
          <h3 style={S.sidebarTitle}>Categories</h3>
          <span style={S.catLink(!selectedCatSlug)} onClick={() => updateParam('category', '')}>
            All Products
          </span>
          {categories.map(cat => (
            <div key={cat.id}>
              <span
                style={S.catLink(selectedCatSlug === cat.slug)}
                onClick={() => updateParam('category', cat.slug)}
              >
                {cat.name}
              </span>
              {cat.children && cat.children.map(sub => (
                <span
                  key={sub.id}
                  style={{
                    ...S.catLink(selectedCatSlug === sub.slug),
                    paddingLeft: '1.25rem',
                    fontSize: '0.8rem'
                  }}
                  onClick={() => updateParam('category', sub.slug)}
                >
                  └ {sub.name}
                </span>
              ))}
            </div>
          ))}

          <h3 style={{ ...S.sidebarTitle, marginTop: '2rem' }}>Availability</h3>
          <label style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem', cursor: 'pointer' }}>
            <input type="radio" name="avail" checked={!availability} onChange={() => updateParam('availability', '')} />
            All Items
          </label>
          <label style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem', cursor: 'pointer' }}>
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

        {/* Main Grid content */}
        <div style={S.main}>
          {/* Active Chips & Sort Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
              {query && (
                <span style={S.chip}>
                  Search: "{query}" <span style={S.chipRemove} onClick={() => updateParam('search', '')}>×</span>
                </span>
              )}
              {selectedCatSlug && (
                <span style={S.chip}>
                  Category: {getSelectedCategoryName()} <span style={S.chipRemove} onClick={() => updateParam('category', '')}>×</span>
                </span>
              )}
              {(minPrice || maxPrice) && (
                <span style={S.chip}>
                  Price: ₹{minPrice || '0'} - ₹{maxPrice || '∞'} 
                  <span style={S.chipRemove} onClick={() => { updateParam('min_price', ''); updateParam('max_price', ''); }}>×</span>
                </span>
              )}
              {availability && (
                <span style={S.chip}>
                  {availability === 'in_stock' ? 'In Stock' : 'Out of Stock'}{' '}
                  <span style={S.chipRemove} onClick={() => updateParam('availability', '')}>×</span>
                </span>
              )}
              {(query || selectedCatSlug || minPrice || maxPrice || availability) && (
                <button style={S.clearAll} onClick={clearAllFilters}>Clear All Filters</button>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Sort By:</span>
              <select style={S.select} value={ordering} onChange={e => updateParam('ordering', e.target.value)}>
                <option value="-created_at">Newest First</option>
                <option value="base_price">Price: Low to High</option>
                <option value="-base_price">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Grid listing */}
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
                <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                  <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1rem' }}>🔍</span>
                  <h4 style={{ fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>No products found</h4>
                  <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Try changing your filters or search terms.</p>
                  <button
                    style={{ ...S.pageBtn(false), marginTop: '1.25rem', borderColor: '#f43f5e', color: '#f43f5e', padding: '0.6rem 1.25rem' }}
                    onClick={clearAllFilters}
                  >
                    Clear All Filters
                  </button>
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
    </BuyerLayout>
  );
};

export default ProductListPage;
