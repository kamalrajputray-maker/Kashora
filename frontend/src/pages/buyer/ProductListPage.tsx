import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { publicProductAPI, categoryAPI, Category, PublicProduct } from '../../services/api';
import BuyerLayout from '../../components/BuyerLayout';

export const ProductListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

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
      <div className="byr-page">
        {/* Sidebar Filters */}
        <div className={`byr-sidebar ${isMobileFilterOpen ? 'byr-sidebar--open' : ''}`}>
          {isMobileFilterOpen && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--byr-card-border)', paddingBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--byr-text-1)' }}>Filters & Sorting</h2>
              <button onClick={() => setIsMobileFilterOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--byr-text-muted)' }}>×</button>
            </div>
          )}


          <h3 className="byr-sidebar__title" style={{ marginTop: 32 }}>Availability</h3>
          <label style={{ display: 'flex', gap: 8, fontSize: '0.95rem', color: 'var(--byr-text-2)', marginBottom: 8, cursor: 'pointer' }}>
            <input type="radio" name="avail" checked={!availability} onChange={() => updateParam('availability', '')} />
            All Items
          </label>
          <label style={{ display: 'flex', gap: 8, fontSize: '0.95rem', color: 'var(--byr-text-2)', marginBottom: 8, cursor: 'pointer' }}>
            <input type="radio" name="avail" checked={availability === 'in_stock'} onChange={() => updateParam('availability', 'in_stock')} />
            In Stock Only
          </label>

          <h3 className="byr-sidebar__title" style={{ marginTop: 32 }}>Price Range (₹)</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="byr-input"
              placeholder="Min"
              type="number"
              value={minPrice}
              onChange={e => updateParam('min_price', e.target.value)}
            />
            <input
              className="byr-input"
              placeholder="Max"
              type="number"
              value={maxPrice}
              onChange={e => updateParam('max_price', e.target.value)}
            />
          </div>
        </div>

        {/* Main Grid content */}
        <div className="byr-main">
          {/* Active Chips & Sort Row */}
          <div className="byr-filters-row">
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
              <button 
                className="byr-btn byr-btn--outline byr-mobile-filter-btn" 
                style={{ marginRight: 8, marginBottom: 8 }} 
                onClick={() => setIsMobileFilterOpen(true)}
              >
                ⚙️ Filter
              </button>
              {query && (
                <span className="byr-chip">
                  Search: "{query}" <span className="byr-chip__remove" onClick={() => updateParam('search', '')}>×</span>
                </span>
              )}
              {selectedCatSlug && (
                <span className="byr-chip">
                  Category: {getSelectedCategoryName()} <span className="byr-chip__remove" onClick={() => updateParam('category', '')}>×</span>
                </span>
              )}
              {(minPrice || maxPrice) && (
                <span className="byr-chip">
                  Price: ₹{minPrice || '0'} - ₹{maxPrice || '∞'} 
                  <span className="byr-chip__remove" onClick={() => { updateParam('min_price', ''); updateParam('max_price', ''); }}>×</span>
                </span>
              )}
              {availability && (
                <span className="byr-chip">
                  {availability === 'in_stock' ? 'In Stock' : 'Out of Stock'}{' '}
                  <span className="byr-chip__remove" onClick={() => updateParam('availability', '')}>×</span>
                </span>
              )}
              {(query || selectedCatSlug || minPrice || maxPrice || availability) && (
                <button className="byr-clear-btn" onClick={clearAllFilters}>Clear All Filters</button>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '0.95rem', color: 'var(--byr-text-3)', fontWeight: 600 }}>Sort By:</span>
              <select className="byr-input" style={{ width: 'auto' }} value={ordering} onChange={e => updateParam('ordering', e.target.value)}>
                <option value="-created_at">Newest First</option>
                <option value="base_price">Price: Low to High</option>
                <option value="-base_price">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Grid listing */}
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--byr-text-muted)' }}>Loading catalog...</div>
          ) : (
            <>
              <div className="byr-grid">
                {products.map(p => {
                  const discPct = p.compare_at_price ? Math.round(((Number(p.compare_at_price) - Number(p.base_price)) / Number(p.compare_at_price)) * 100) : 0;
                  return (
                    <div key={p.id} className="byr-card" onClick={() => navigate(`/products/${p.slug}`)}>
                      <div className="byr-card__img-wrap">
                        {p.primary_image ? (
                          <img src={p.primary_image} alt={p.name} className="byr-card__img" />
                        ) : (
                          <span style={{ fontSize: '2.5rem' }}>🛍️</span>
                        )}
                      </div>
                      <div className="byr-card__body">
                        <span className="byr-card__brand">{p.brand}</span>
                        <h4 className="byr-card__name">{p.name}</h4>
                        
                        <div className="byr-card__price-row">
                          <span className="byr-card__price">₹{p.base_price}</span>
                          {p.compare_at_price && (
                            <>
                              <span className="byr-card__compare">₹{p.compare_at_price}</span>
                              <span className="byr-card__discount">{discPct}% OFF</span>
                            </>
                          )}
                        </div>
                        
                        <span className={`byr-card__badge ${p.in_stock ? 'byr-card__badge--in' : 'byr-card__badge--out'}`}>
                          {p.in_stock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {products.length === 0 && (
                <div style={{ textAlign: 'center', padding: '64px', color: 'var(--byr-text-muted)' }}>
                  <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: 16 }}>🔍</span>
                  <h4 style={{ fontWeight: 700, color: 'var(--byr-text-1)', marginBottom: 8, fontSize: '1.25rem' }}>No products found</h4>
                  <p style={{ fontSize: '0.95rem' }}>Try changing your filters or search terms.</p>
                  <button className="byr-page-btn" style={{ marginTop: 24, borderColor: 'var(--byr-accent)', color: 'var(--byr-accent)' }} onClick={clearAllFilters}>
                    Clear All Filters
                  </button>
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="byr-pagination">
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pNum => (
                    <button 
                      key={pNum} 
                      className={`byr-page-btn ${page === pNum ? 'byr-page-btn--active' : ''}`}
                      onClick={() => handlePageChange(pNum)}
                    >
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
