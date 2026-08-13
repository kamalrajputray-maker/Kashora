import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { categoryAPI, Category, publicProductAPI, cartAPI } from '../services/api';

const S = {
  header: { background: '#fff', borderBottom: '1px solid #f1f5f9', position: 'sticky' as const, top: 0, zIndex: 100, fontFamily: "'Outfit', 'Inter', sans-serif" },
  headerMain: { maxWidth: '1400px', margin: '0 auto', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' },
  logo: { fontSize: '1.6rem', fontWeight: '800', color: '#f43f5e', textDecoration: 'none', letterSpacing: '-0.02em' },
  searchContainer: { flex: 1, maxWidth: '600px', position: 'relative' as const },
  searchRow: { display: 'flex', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' },
  searchInput: { border: 'none', background: 'transparent', padding: '0.65rem 1.25rem', fontSize: '0.9rem', width: '100%', outline: 'none' },
  searchBtn: { border: 'none', background: '#f43f5e', color: '#fff', padding: '0 1.25rem', cursor: 'pointer', fontWeight: '600' },
  suggestions: { position: 'absolute' as const, top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 110, overflow: 'hidden' },
  suggestionItem: { padding: '0.65rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', hover: { background: '#f8fafc' } },
  navRight: { display: 'flex', alignItems: 'center', gap: '1.75rem', fontSize: '0.9rem', color: '#475569' },
  navLink: { textDecoration: 'none', color: '#475569', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' },
  accountMenu: { position: 'relative' as const },
  dropdown: { position: 'absolute' as const, top: '100%', right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '0.75rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', width: '220px', zIndex: 110, overflow: 'hidden', padding: '0.5rem 0' },
  dropdownItem: { display: 'block', padding: '0.6rem 1.25rem', textDecoration: 'none', color: '#475569', fontSize: '0.88rem', cursor: 'pointer' },
  dropdownHeader: { padding: '0.6rem 1.25rem', borderBottom: '1px solid #f1f5f9', fontWeight: '700', color: '#1e293b', fontSize: '0.88rem' },
  catNav: { borderBottom: '1px solid #f1f5f9', background: '#fff', overflow: 'visible' as const },
  catNavInner: { maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '2rem', padding: '0 2rem', position: 'relative' as const },
  catItem: { padding: '0.8rem 0', fontSize: '0.92rem', color: '#1e293b', fontWeight: '600', cursor: 'pointer', textDecoration: 'none', borderBottom: '2px solid transparent', hover: { borderBottomColor: '#f43f5e' } },
  megaMenu: { position: 'absolute' as const, top: '100%', left: '2rem', right: '2rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0 0 8px 8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', zIndex: 99 },
  megaTitle: { fontSize: '0.88rem', fontWeight: '700', color: '#f43f5e', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.5rem' },
  megaItem: { display: 'block', padding: '0.25rem 0', textDecoration: 'none', color: '#475569', fontSize: '0.85rem' },
  footer: { background: '#f8fafc', borderTop: '1px solid #e2e8f0', marginTop: '4rem', padding: '3rem 2rem 1.5rem 2rem', fontFamily: "'Outfit', 'Inter', sans-serif" },
  footerGrid: { maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' },
  footerCol: { display: 'flex', flexDirection: 'column' as const, gap: '0.75rem' },
  footerTitle: { fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.5rem' },
  footerLink: { textDecoration: 'none', color: '#64748b', fontSize: '0.88rem' }
};

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
  
  const suggestRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load categories
    categoryAPI.getCategories().then(res => setCategories(res.data));

    if (isAuthenticated) {
      cartAPI.get().then(res => {
        const count = res.data.items.reduce((acc, curr) => acc + curr.quantity, 0);
        setCartCount(count);
      }).catch(() => {});
    }

    // Handle clicks outside dropdowns
    const handler = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isAuthenticated]);

  // Sync initialSearchVal
  useEffect(() => {
    setSearchVal(initialSearchVal);
  }, [initialSearchVal]);

  // Fetch search suggestions
  useEffect(() => {
    if (searchVal.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    // Query products
    publicProductAPI.list({ search: searchVal }).then(res => {
      const names = res.data.results.map(p => p.name).slice(0, 5);
      setSuggestions(names);
    }).catch(() => {});
  }, [searchVal]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSuggestionsOpen(false);
    if (onSearch) {
      onSearch(searchVal);
    } else {
      navigate(`/products?search=${encodeURIComponent(searchVal)}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Resolve Become a Seller route
  const getSellerRoute = () => {
    if (user?.role === 'SELLER') return '/seller/dashboard';
    return '/seller/register';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#fafafa' }}>
      {/* Top Header */}
      <header style={S.header}>
        <div style={S.headerMain}>
          <Link to="/products" style={S.logo}>Kashora</Link>
          
          {/* Search bar */}
          <div style={S.searchContainer} ref={suggestRef}>
            <form onSubmit={handleSearchSubmit} style={S.searchRow}>
              <input
                style={S.searchInput}
                placeholder="Search for products, brands and more..."
                value={searchVal}
                onChange={e => {
                  setSearchVal(e.target.value);
                  setSuggestionsOpen(true);
                }}
                onFocus={() => setSuggestionsOpen(true)}
              />
              <button type="submit" style={S.searchBtn}>Search</button>
            </form>
            {suggestionsOpen && suggestions.length > 0 && (
              <div style={S.suggestions}>
                {suggestions.map((item, index) => (
                  <div
                    key={index}
                    style={S.suggestionItem}
                    onClick={() => {
                      setSearchVal(item);
                      setSuggestionsOpen(false);
                      if (onSearch) {
                        onSearch(item);
                      } else {
                        navigate(`/products?search=${encodeURIComponent(item)}`);
                      }
                    }}
                  >
                    🔍 {item}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nav Right */}
          <div style={S.navRight}>
            <Link to={getSellerRoute()} style={S.navLink}>Become a Seller</Link>
            <Link to="/cart" style={S.navLink}>🛒 Cart {cartCount > 0 && `(${cartCount})`}</Link>
            
            {isAuthenticated ? (
              <div style={S.accountMenu} ref={accountRef}>
                <span style={S.navLink} onClick={() => setAccountOpen(!accountOpen)}>
                  👤 Account ▼
                </span>
                {accountOpen && (
                  <div style={S.dropdown}>
                    <div style={S.dropdownHeader}>Hi, {user?.first_name}</div>
                    <Link to="/profile" style={S.dropdownItem} onClick={() => setAccountOpen(false)}>My Profile</Link>
                    <span style={{ ...S.dropdownItem, opacity: 0.5, cursor: 'not-allowed' }}>My Orders</span>
                    <Link to="/wishlist" style={S.dropdownItem} onClick={() => setAccountOpen(false)}>Wishlist</Link>
                    <hr style={{ border: 'none', borderBottom: '1px solid #f1f5f9', margin: '0.5rem 0' }} />
                    <span style={S.dropdownItem} onClick={handleLogout}>Logout</span>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" style={S.navLink}>Login</Link>
            )}
          </div>
        </div>

        {/* Dynamic Category Navbar */}
        <div style={S.catNav}>
          <div style={S.catNavInner}>
            {categories.filter(c => !c.parent).slice(0, 10).map(cat => (
              <div
                key={cat.id}
                style={{ position: 'relative' }}
                onMouseEnter={() => setHoveredCatId(cat.id)}
                onMouseLeave={() => setHoveredCatId(null)}
              >
                <Link
                  to={`/products?category=${cat.slug}`}
                  style={{
                    ...S.catItem,
                    borderBottomColor: hoveredCatId === cat.id ? '#f43f5e' : 'transparent'
                  }}
                >
                  {cat.name}
                </Link>
                {hoveredCatId === cat.id && cat.children && cat.children.length > 0 && (
                  <div style={S.megaMenu}>
                    {cat.children.map(sub => (
                      <div key={sub.id}>
                        <Link to={`/products?category=${sub.slug}`} style={S.megaTitle}>
                          {sub.name}
                        </Link>
                        {sub.children && sub.children.map(child => (
                          <Link key={child.id} to={`/products?category=${child.slug}`} style={S.megaItem}>
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

      {/* Main Content */}
      <main style={{ flex: 1, width: '100%' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={S.footer}>
        <div style={S.footerGrid}>
          <div style={S.footerCol}>
            <h4 style={S.footerTitle}>Shop</h4>
            <Link to="/products" style={S.footerLink}>All Products</Link>
            <Link to="/products?category=women" style={S.footerLink}>Women's Fashion</Link>
            <Link to="/products?category=men" style={S.footerLink}>Men's Fashion</Link>
          </div>
          <div style={S.footerCol}>
            <h4 style={S.footerTitle}>Become a Partner</h4>
            <Link to={getSellerRoute()} style={S.footerLink}>Register as Seller</Link>
            <Link to={getSellerRoute()} style={S.footerLink}>Seller Dashboard</Link>
          </div>
          <div style={S.footerCol}>
            <h4 style={S.footerTitle}>Policies</h4>
            <span style={S.footerLink}>Terms & Conditions</span>
            <span style={S.footerLink}>Privacy Policy</span>
            <span style={S.footerLink}>Return Policy</span>
          </div>
          <div style={S.footerCol}>
            <h4 style={S.footerTitle}>Contact</h4>
            <span style={S.footerLink}>support@kashora.com</span>
            <span style={S.footerLink}>Kashora Corp India</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '3rem', fontSize: '0.8rem', color: '#94a3b8' }}>
          © {new Date().getFullYear()} Kashora. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default BuyerLayout;
