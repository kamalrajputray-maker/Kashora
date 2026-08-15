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
      <div className="byr-homepage">
        
        {/* 1. Hero Banner */}
        <div className="byr-section">
          <div className="byr-hero">
            <div className="byr-hero__content">
              <h1 className="byr-hero__title">UP TO 35% OFF</h1>
              <p className="byr-hero__subtitle">On your first order. Shop exclusive offers and trends.</p>
              <button className="byr-btn byr-btn--primary" onClick={() => navigate('/products')}>Shop Now</button>
            </div>
            <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=800&auto=format&fit=crop" alt="Hero" className="byr-hero__img" />
          </div>
        </div>

        {/* 2. Benefits Strip */}
        <div className="byr-section">
          <div className="byr-benefits">
            <div className="byr-benefit-item">✅ 7 Days Easy Return</div>
            <div className="byr-benefit-item">💵 Cash on Delivery</div>
            <div className="byr-benefit-item">🏷️ Lowest Prices</div>
            <div className="byr-benefit-item">🔒 Secure Payments</div>
            <div className="byr-benefit-item">🚚 Fast Delivery</div>
          </div>
        </div>

        {/* 3. Circular Categories */}
        <div className="byr-section">
          <div className="byr-h-scroll">
            {categories.slice(0, 10).map(cat => (
              <div key={cat.id} className="byr-circle-cat" onClick={() => updateParam('category', cat.slug)}>
                <div className="byr-circle-cat__img-wrap">
                  {cat.image ? <img src={cat.image} className="byr-circle-cat__img" alt={cat.name} loading="lazy" /> : <span style={{fontSize: '2.5rem'}}>🛍️</span>}
                </div>
                <span className="byr-circle-cat__label">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Promo Banner Large */}
        <div className="byr-section">
           <div className="byr-section-header">
              <h2 className="byr-section-header__title">Products you Love. Quality we Trust.</h2>
           </div>
           <div className="byr-h-scroll">
             <div className="byr-promo-card" onClick={() => navigate('/products?category=women')}>
                <img src="https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=300&auto=format&fit=crop" className="byr-promo-card__img" alt="Lehengas" />
                <div className="byr-promo-card__bottom">Lehengas</div>
             </div>
             <div className="byr-promo-card" onClick={() => navigate('/products?category=men')}>
                <img src="https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=300&auto=format&fit=crop" className="byr-promo-card__img" alt="Menswear" />
                <div className="byr-promo-card__bottom">Menswear</div>
             </div>
             <div className="byr-promo-card" onClick={() => navigate('/products?category=women')}>
                <img src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=300&auto=format&fit=crop" className="byr-promo-card__img" alt="Sarees" />
                <div className="byr-promo-card__bottom">Sarees</div>
             </div>
             <div className="byr-promo-card" onClick={() => navigate('/products?category=jewellery')}>
                <img src="https://images.unsplash.com/photo-1599643478514-4a4e09d949c8?q=80&w=300&auto=format&fit=crop" className="byr-promo-card__img" alt="Jewellery" />
                <div className="byr-promo-card__bottom">Jewellery</div>
             </div>
           </div>
        </div>

        {/* 5. Original Brands */}
        <div className="byr-section">
           <div className="byr-section-header">
              <h2 className="byr-section-header__title">Original Brands</h2>
              <span className="byr-section-header__link" style={{cursor: 'pointer'}}>VIEW ALL →</span>
           </div>
           <div className="byr-h-scroll">
              <div className="byr-brand-card"><h3 style={{ margin: 0, color: 'var(--byr-text-muted)' }}>Mi</h3></div>
              <div className="byr-brand-card"><h3 style={{ margin: 0, color: '#e11d48' }}>Bata</h3></div>
              <div className="byr-brand-card"><h3 style={{ margin: 0, color: '#065f46' }}>Mamaearth</h3></div>
              <div className="byr-brand-card"><h3 style={{ margin: 0, color: '#9333ea' }}>Plum</h3></div>
              <div className="byr-brand-card"><h3 style={{ margin: 0, color: '#2563eb' }}>Nivea</h3></div>
              <div className="byr-brand-card"><h3 style={{ margin: 0, color: '#059669' }}>Himalaya</h3></div>
              <div className="byr-brand-card"><h3 style={{ margin: 0, color: '#ea580c' }}>WOW</h3></div>
           </div>
        </div>

        {/* 6. Brand Category Cards */}
        <div className="byr-section">
           <div className="byr-h-scroll">
             <div className="byr-promo-card" onClick={() => navigate('/products?category=electronics')}>
                <img src="https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=300&auto=format&fit=crop" className="byr-promo-card__img" alt="Electronics" />
                <div className="byr-promo-card__bottom">Electronics</div>
             </div>
             <div className="byr-promo-card" onClick={() => navigate('/products?category=beauty')}>
                <img src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=300&auto=format&fit=crop" className="byr-promo-card__img" alt="Makeup" />
                <div className="byr-promo-card__bottom">Makeup</div>
             </div>
             <div className="byr-promo-card" onClick={() => navigate('/products?category=bags')}>
                <img src="https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=300&auto=format&fit=crop" className="byr-promo-card__img" alt="Bags" />
                <div className="byr-promo-card__bottom">Bags</div>
             </div>
             <div className="byr-promo-card" onClick={() => navigate('/products?category=footwear')}>
                <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=300&auto=format&fit=crop" className="byr-promo-card__img" alt="Footwear" />
                <div className="byr-promo-card__bottom">Footwear</div>
             </div>
           </div>
        </div>

        {/* 7. Promo Strip */}
        <div className="byr-section">
           <div className="byr-promo-strip">
              <div>
                <div className="byr-promo-strip__title">UP TO 35% OFF</div>
                <div style={{ fontSize: '1.25rem' }}>ON FIRST ORDER</div>
              </div>
              <button className="byr-promo-strip__btn">Download Now</button>
           </div>
        </div>

        {/* 8. Products For You */}
        <div className="byr-section">
          <h2 className="byr-section-header__title" style={{ marginBottom: 32 }}>Products For You</h2>
          <div className="byr-products-section">
            
            {/* LEFT SIDEBAR */}
            <div className={`byr-sidebar ${isMobileFilterOpen ? 'byr-sidebar--open' : ''}`}>
              {isMobileFilterOpen && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--byr-card-border)', paddingBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--byr-text-1)' }}>Filters & Sorting</h2>
                  <button onClick={() => setIsMobileFilterOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--byr-text-muted)' }}>×</button>
                </div>
              )}
              
              <h3 className="byr-sidebar__title">Categories</h3>
              <span 
                className={`byr-sidebar__link ${!selectedCatSlug ? 'byr-sidebar__link--active' : ''}`} 
                onClick={() => updateParam('category', '')}
              >
                All Products
              </span>
              {categories.map(cat => (
                <div key={cat.id}>
                  <span
                    className={`byr-sidebar__link ${selectedCatSlug === cat.slug ? 'byr-sidebar__link--active' : ''}`}
                    onClick={() => updateParam('category', cat.slug)}
                  >
                    {cat.name}
                  </span>
                  {cat.children && cat.children.map(sub => (
                    <span
                      key={sub.id}
                      className={`byr-sidebar__link ${selectedCatSlug === sub.slug ? 'byr-sidebar__link--active' : ''}`}
                      style={{ paddingLeft: '24px', fontSize: '0.85rem' }}
                      onClick={() => updateParam('category', sub.slug)}
                    >
                      └ {sub.name}
                    </span>
                  ))}
                </div>
              ))}

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

            {/* MAIN GRID */}
            <div className="byr-main">
              {/* Sort Bar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', padding: '16px 24px', background: 'var(--byr-card-bg)', border: '1px solid var(--byr-card-border)', borderRadius: 'var(--byr-radius)', alignItems: 'center', justifyContent: 'space-between' }}>
                <button 
                  className="byr-btn byr-btn--outline byr-mobile-filter-btn" 
                  onClick={() => setIsMobileFilterOpen(true)}
                >
                  ⚙️ Filters
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
                  <span style={{ fontSize: '0.95rem', color: 'var(--byr-text-3)', fontWeight: 600 }}>Sort By:</span>
                  <select className="byr-input" style={{ width: 'auto', padding: '6px 12px' }} value={ordering} onChange={e => updateParam('ordering', e.target.value)}>
                    <option value="-created_at">Newest First</option>
                    <option value="base_price">Price: Low to High</option>
                    <option value="-base_price">Price: High to Low</option>
                  </select>
                </div>
              </div>

          {/* Active Chips & Sort Row */}
          <div className="byr-filters-row">
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
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
                        <div className="byr-card__wishlist" onClick={(e) => { e.stopPropagation(); alert('Added to wishlist!'); }}>♡</div>
                        {p.primary_image ? (
                          <img src={p.primary_image} alt={p.name} className="byr-card__img" />
                        ) : (
                          <span style={{ fontSize: '2.5rem' }}>🛍️</span>
                        )}
                      </div>
                      <div className="byr-card__body">
                        <span className="byr-card__brand">{p.brand}</span>
                        <h4 className="byr-card__name">{p.name}</h4>
                        
                        <div className="byr-card__rating">
                          ⭐ 4.3 <span className="byr-card__reviews">(1200 Reviews)</span>
                        </div>
                        
                        <div className="byr-card__price-row">
                          <span className="byr-card__price">₹{p.base_price}</span>
                          {p.compare_at_price && (
                            <>
                              <span className="byr-card__compare">₹{p.compare_at_price}</span>
                              <span className="byr-card__discount">{discPct}% OFF</span>
                            </>
                          )}
                        </div>
                        
                        <div className="byr-card__delivery">🚚 Free Delivery</div>
                        
                        <span className={`byr-card__badge ${p.in_stock ? 'byr-card__badge--in' : 'byr-card__badge--out'}`} style={{ display: 'none' }}>
                          {p.in_stock ? 'In Stock' : 'Out of Stock'}
                        </span>

                        <button className="byr-card__add-btn" onClick={(e) => { e.stopPropagation(); alert('Added to cart!'); }}>Add to Cart</button>
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
        </div>
      </div>
    </BuyerLayout>
  );
};

export default ProductListPage;
