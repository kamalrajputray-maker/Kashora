import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import React, { useEffect } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import AdminDashboardLayout from './components/AdminDashboardLayout';
import SellerDashboardLayout from './components/SellerDashboardLayout';
import { settingsAPI } from './services/api';

// Auth Pages
import SellerLoginPage from './pages/seller/SellerLoginPage';
import SellerRegisterPage from './pages/seller/SellerRegisterPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import BuyerLoginPage from './pages/buyer/BuyerLoginPage';
import BuyerRegisterPage from './pages/buyer/BuyerRegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

// Buyer Pages
import BuyerDashboardPage from './pages/buyer/BuyerDashboardPage';
import ProductListPage from './pages/buyer/ProductListPage';
import ProductDetailPage from './pages/buyer/ProductDetailPage';
import BuyerProfilePage from './pages/buyer/BuyerProfilePage';
import CartPage from './pages/buyer/CartPage';
import WishlistPage from './pages/buyer/WishlistPage';
import CheckoutPage from './pages/buyer/CheckoutPage';
import OrderListPage from './pages/buyer/OrderListPage';
import OrderDetailPage from './pages/buyer/OrderDetailPage';
import SellerOrderListPage from './pages/seller/SellerOrderListPage';

// Seller Pages
import SellerDashboardPage from './pages/seller/SellerDashboardPage';
import SellerProfilePage from './pages/seller/SellerProfilePage';
import SellerProductListPage from './pages/seller/SellerProductListPage';
import SellerProductDetailPage from './pages/seller/SellerProductDetailPage';
import { SellerProductCreatePage, SellerProductEditPage } from './pages/seller/SellerProductFormPage';
import InventoryListPage from './pages/seller/InventoryListPage';
import InventoryDetailPage from './pages/seller/InventoryDetailPage';

// Admin Pages
import AdminSellerListPage from './pages/admin/AdminSellerListPage';
import AdminSellerDetailPage from './pages/admin/AdminSellerDetailPage';
import AdminProductListPage from './pages/admin/AdminProductListPage';
import AdminCategoryListPage from './pages/admin/categories/AdminCategoryListPage';
import AdminCategoryFormPage from './pages/admin/categories/AdminCategoryFormPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';

// Not Found
import NotFoundPage from './pages/NotFoundPage';

// E2E Test Runner
import E2ERunnerPage from './pages/E2ERunnerPage';

import { ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import { getTheme } from './theme';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

const CategoryRedirect: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/products?category=${slug}`} replace />;
};

/** Hide the global Navbar on admin/seller dashboard routes */
const ConditionalNavbar: React.FC = () => {
  const location = useLocation();
  const hideOn = ['/admin/', '/seller/', '/super-admin/'];
  if (hideOn.some((prefix) => location.pathname.startsWith(prefix))) return null;
  return <Navbar />;
};

const DynamicFavicon: React.FC = () => {
  useEffect(() => {
    settingsAPI.get().then(res => {
      if (res.data.site_favicon) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = res.data.site_favicon;
      }
    }).catch(console.error);
  }, []);
  return null;
};

const App: React.FC = () => {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = React.useMemo(() => getTheme(prefersDark ? 'dark' : 'light'), [prefersDark]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <DynamicFavicon />
          <ConditionalNavbar />
          <Routes>
            {/* ── Public Auth Routes ── */}
            {/* ── E2E Test Runner (public) ── */}
            <Route path="/e2e-runner" element={<E2ERunnerPage />} />

            <Route path="/login" element={<BuyerLoginPage />} />
            <Route path="/register" element={<BuyerRegisterPage />} />
            <Route path="/seller/login" element={<SellerLoginPage />} />
            <Route path="/seller/register" element={<SellerRegisterPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* ── Public Catalog Routes ── */}
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/products/:slug" element={<ProductDetailPage />} />
            <Route path="/categories/:slug" element={<CategoryRedirect />} />
            <Route path="/profile" element={<ProtectedRoute requiredRole={['BUYER', 'SELLER']}><BuyerProfilePage /></ProtectedRoute>} />
            <Route path="/cart" element={<ProtectedRoute requiredRole={['BUYER', 'SELLER']}><CartPage /></ProtectedRoute>} />
            <Route path="/wishlist" element={<ProtectedRoute requiredRole={['BUYER', 'SELLER']}><WishlistPage /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute requiredRole={['BUYER', 'SELLER']}><CheckoutPage /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute requiredRole={['BUYER', 'SELLER']}><OrderListPage /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute requiredRole={['BUYER', 'SELLER']}><OrderDetailPage /></ProtectedRoute>} />

            {/* ── Buyer Routes ── */}
            <Route path="/buyer/*" element={
              <ProtectedRoute requiredRole="BUYER">
                <Routes>
                  <Route path="dashboard" element={<BuyerDashboardPage />} />
                  <Route path="*" element={<Navigate to="/buyer/dashboard" />} />
                </Routes>
              </ProtectedRoute>
            } />

            {/* ── Seller Routes (with SellerDashboardLayout) ── */}
            <Route path="/seller/*" element={
              <ProtectedRoute requiredRole="SELLER">
                <SellerDashboardLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<SellerDashboardPage />} />
              <Route path="profile" element={<SellerProfilePage />} />
              <Route path="products" element={<SellerProductListPage />} />
              <Route path="products/create" element={<SellerProductCreatePage />} />
              <Route path="products/:id" element={<SellerProductDetailPage />} />
              <Route path="products/:id/edit" element={<SellerProductEditPage />} />
              <Route path="inventory" element={<InventoryListPage />} />
              <Route path="inventory/:id" element={<InventoryDetailPage />} />
              <Route path="orders" element={<SellerOrderListPage />} />
              <Route path="*" element={<Navigate to="/seller/dashboard" />} />
            </Route>

            {/* ── Admin & SuperAdmin Routes (with AdminDashboardLayout) ── */}
            <Route path="/admin/*" element={
              <ProtectedRoute requiredRole={ADMIN_ROLES}>
                <AdminDashboardLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="buyers" element={<div className="adm-content">Buyer Management (coming soon)</div>} />
              <Route path="products" element={<AdminProductListPage />} />
              <Route path="orders" element={<div className="adm-content">Order Management (coming soon)</div>} />
              <Route path="reports" element={<div className="adm-content">Reports (coming soon)</div>} />
              <Route path="sellers" element={<AdminSellerListPage />} />
              <Route path="sellers/:sellerId" element={<AdminSellerDetailPage />} />
              <Route path="categories" element={<AdminCategoryListPage />} />
              <Route path="categories/create" element={<AdminCategoryFormPage />} />
              <Route path="categories/:id/edit" element={<AdminCategoryFormPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>

            <Route path="/super-admin/*" element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN']}>
                <AdminDashboardLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<div style={{ padding: 24 }}>Super Admin Dashboard (coming soon)</div>} />
              <Route path="admins" element={<div style={{ padding: 24 }}>Admin Management (coming soon)</div>} />
              <Route path="*" element={<Navigate to="/super-admin/dashboard" replace />} />
            </Route>

            {/* ── Redirects ── */}
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
