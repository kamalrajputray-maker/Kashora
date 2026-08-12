import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import SellerNavigation from './components/SellerNavigation';
import AdminNavigation from './components/AdminNavigation';

// Auth Pages
import SellerLoginPage from './pages/seller/SellerLoginPage';
import SellerRegisterPage from './pages/seller/SellerRegisterPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import BuyerLoginPage from './pages/buyer/BuyerLoginPage';

// Buyer Pages
import BuyerDashboardPage from './pages/buyer/BuyerDashboardPage';

// Seller Pages
import SellerDashboardPage from './pages/seller/SellerDashboardPage';
import SellerProfilePage from './pages/seller/SellerProfilePage';
import SellerProductListPage from './pages/seller/SellerProductListPage';
import SellerProductDetailPage from './pages/seller/SellerProductDetailPage';
import { SellerProductCreatePage, SellerProductEditPage } from './pages/seller/SellerProductFormPage';

// Admin Pages
import AdminSellerListPage from './pages/admin/AdminSellerListPage';
import AdminSellerDetailPage from './pages/admin/AdminSellerDetailPage';

// Not Found
import NotFoundPage from './pages/NotFoundPage';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar />
          <div className="app-content">
            <Routes>
              {/* ── Public Auth Routes ── */}
              <Route path="/login" element={<BuyerLoginPage />} />
              <Route path="/seller/login" element={<SellerLoginPage />} />
              <Route path="/seller/register" element={<SellerRegisterPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />

              {/* ── Buyer Routes ── */}
              <Route
                path="/buyer/*"
                element={
                  <ProtectedRoute requiredRole="BUYER">
                    <Routes>
                      <Route path="dashboard" element={<BuyerDashboardPage />} />
                      <Route path="*" element={<Navigate to="/buyer/dashboard" />} />
                    </Routes>
                  </ProtectedRoute>
                }
              />

              {/* ── Seller Routes ── */}
              <Route
                path="/seller/*"
                element={
                  <ProtectedRoute requiredRole="SELLER">
                    <div className="seller-layout">
                      <SellerNavigation />
                      <div className="seller-content">
                        <Routes>
                          <Route path="dashboard" element={<SellerDashboardPage />} />
                          <Route path="profile" element={<SellerProfilePage />} />
                          <Route path="products" element={<SellerProductListPage />} />
                          <Route path="products/create" element={<SellerProductCreatePage />} />
                          <Route path="products/:id" element={<SellerProductDetailPage />} />
                          <Route path="products/:id/edit" element={<SellerProductEditPage />} />
                          <Route path="*" element={<Navigate to="/seller/dashboard" />} />
                        </Routes>
                      </div>
                    </div>
                  </ProtectedRoute>
                }
              />

              {/* ── Admin & SuperAdmin Routes ── */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute requiredRole={ADMIN_ROLES}>
                    <div className="admin-layout">
                      <AdminNavigation />
                      <div className="admin-content">
                        <Routes>
                          <Route path="sellers" element={<AdminSellerListPage />} />
                          <Route path="sellers/:sellerId" element={<AdminSellerDetailPage />} />
                          <Route path="*" element={<Navigate to="/admin/sellers" />} />
                        </Routes>
                      </div>
                    </div>
                  </ProtectedRoute>
                }
              />

              {/* ── Redirects ── */}
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
