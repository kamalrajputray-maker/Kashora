import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { categoryAPI, Category, publicProductAPI, cartAPI } from '../services/api';
import '../styles/buyer-store.css';

interface BuyerLayoutProps {
  children: React.ReactNode;
  onSearch?: (term: string) => void;
  initialSearchVal?: string;
}

export const BuyerLayout: React.FC<BuyerLayoutProps> = ({ children, onSearch, initialSearchVal = '' }) => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [hoveredCatId, setHoveredCatId] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchVal, setSearchVal] = useState(initialSearchVal);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem('byrTheme') as 'dark' || 'light');
  
  const suggestRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    categoryAPI.getCategories().then(res => setCategories(res.data));
    if (isAuthenticated) {
      cartAPI.get().then(res => {
        const count = res.data.items.reduce((acc, curr) => acc + curr.quantity, 0);
        setCartCount(count);
      }).catch(() => {});
    }

    const handler = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) setSuggestionsOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isAuthenticated]);

  useEffect(() => { setSearchVal(initialSearchVal); }, [initialSearchVal]);

  useEffect(() => {
    if (searchVal.trim().length < 2) { setSuggestions([]); return; }
    publicProductAPI.list({ search: searchVal }).then(res => {
      setSuggestions(res.data.results.map(p => p.name).slice(0, 5));
    }).catch(() => {});
  }, [searchVal]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSuggestionsOpen(false);
    if (onSearch) onSearch(searchVal);
    else navigate(`/products?search=${encodeURIComponent(searchVal)}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getSellerRoute = () => {
    if (user?.role === 'SELLER') return '/seller/dashboard';
    return '/seller/register';
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('byrTheme', newTheme);
  };

  return (
    <div className="byr-layout" data-theme={theme}>
      <header className="byr-header">
        <div className="byr-header__main">
          <Link to="/products" className="byr-logo byr-title-font">Kashora</Link>
          
          <div className="byr-search-wrap" ref={suggestRef}>
            <form onSubmit={handleSearchSubmit} className="byr-search-row">
              <input
                className="byr-search-input"
                placeholder="Search for products, brands and more..."
                value={searchVal}
                onChange={e => { setSearchVal(e.target.value); setSuggestionsOpen(true); }}
                onFocus={() => setSuggestionsOpen(true)}
              />
              <button type="submit" className="byr-search-btn">Search</button>
            </form>
            {suggestionsOpen && suggestions.length > 0 && (
              <div className="byr-suggestions">
                {suggestions.map((item, index) => (
                  <div
                    key={index} className="byr-suggestion-item"
                    onClick={() => {
                      setSearchVal(item); setSuggestionsOpen(false);
                      if (onSearch) onSearch(item); else navigate(`/products?search=${encodeURIComponent(item)}`);
                    }}
                  >
                    🔍 {item}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="byr-nav-right">
            <button onClick={toggleTheme} className="byr-theme-toggle" title="Toggle Theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <Link to={getSellerRoute()} className="byr-nav-link">Become a Seller</Link>
            <Link to="/cart" className="byr-nav-link">🛒 Cart {cartCount > 0 && `(${cartCount})`}</Link>
            
            {isAuthenticated ? (
              <div style={{ position: 'relative' }} ref={accountRef}>
                <span className="byr-nav-link" onClick={() => setAccountOpen(!accountOpen)}>
                  👤 Account ▼
                </span>
                {accountOpen && (
                  <div className="byr-account-dropdown">
                    <div className="byr-dropdown-header">Hi, {user?.first_name}</div>
                    <Link to="/profile" className="byr-dropdown-item" onClick={() => setAccountOpen(false)}>My Profile</Link>
                    <Link to="/orders" className="byr-dropdown-item" onClick={() => setAccountOpen(false)}>My Orders</Link>
                    <Link to="/wishlist" className="byr-dropdown-item" onClick={() => setAccountOpen(false)}>Wishlist</Link>
                    <hr style={{ border: 'none', borderBottom: '1px solid var(--byr-card-border)', margin: '8px 0' }} />
                    <span className="byr-dropdown-item" onClick={handleLogout}>Logout</span>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="byr-nav-link">Login</Link>
            )}
          </div>
        </div>

        <div className="byr-catnav">
          <div className="byr-catnav__inner">
            {categories.filter(c => !c.parent).slice(0, 10).map(cat => (
              <div
                key={cat.id} style={{ position: 'relative' }}
                onMouseEnter={() => setHoveredCatId(cat.id)}
                onMouseLeave={() => setHoveredCatId(null)}
              >
                <Link
                  to={`/products?category=${cat.slug}`}
                  className={`byr-cat-item ${hoveredCatId === cat.id ? 'byr-cat-item--active' : ''}`}
                >
                  {cat.name}
                </Link>
                {hoveredCatId === cat.id && cat.children && cat.children.length > 0 && (
                  <div className="byr-mega-menu">
                    {cat.children.map(sub => (
                      <div key={sub.id}>
                        <Link to={`/products?category=${sub.slug}`} className="byr-mega-title">
                          {sub.name}
                        </Link>
                        {sub.children && sub.children.map(child => (
                          <Link key={child.id} to={`/products?category=${child.slug}`} className="byr-mega-item">
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main style={{ flex: 1, width: '100%' }}>
        {children}
      </main>

      <footer className="byr-footer byr-title-font">
        <div className="byr-footer__grid">
          <div className="byr-footer__col">
            <h4 className="byr-footer__title">Shop</h4>
            <Link to="/products" className="byr-footer__link">All Products</Link>
            <Link to="/products?category=women" className="byr-footer__link">Women's Fashion</Link>
            <Link to="/products?category=men" className="byr-footer__link">Men's Fashion</Link>
          </div>
          <div className="byr-footer__col">
            <h4 className="byr-footer__title">Become a Partner</h4>
            <Link to={getSellerRoute()} className="byr-footer__link">Register as Seller</Link>
            <Link to={getSellerRoute()} className="byr-footer__link">Seller Dashboard</Link>
          </div>
          <div className="byr-footer__col">
            <h4 className="byr-footer__title">Policies</h4>
            <span className="byr-footer__link">Terms & Conditions</span>
            <span className="byr-footer__link">Privacy Policy</span>
            <span className="byr-footer__link">Return Policy</span>
          </div>
          <div className="byr-footer__col">
            <h4 className="byr-footer__title">Contact</h4>
            <span className="byr-footer__link">support@kashora.com</span>
            <span className="byr-footer__link">Kashora Corp India</span>
          </div>
        </div>
        <div className="byr-footer__copy">
          © {new Date().getFullYear()} Kashora. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default BuyerLayout;
