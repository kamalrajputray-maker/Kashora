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

// Seller Pages
import SellerDashboardPage from './pages/seller/SellerDashboardPage';
import SellerProfilePage from './pages/seller/SellerProfilePage';

// Admin Pages
import AdminSellerListPage from './pages/admin/AdminSellerListPage';
import AdminSellerDetailPage from './pages/admin/AdminSellerDetailPage';

// Not Found
import NotFoundPage from './pages/NotFoundPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar />
          <div className="app-content">
            <Routes>
              {/* Auth Routes */}
              <Route path="/seller/login" element={<SellerLoginPage />} />
              <Route path="/seller/register" element={<SellerRegisterPage />} />

              {/* Seller Routes */}
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
                          <Route path="*" element={<Navigate to="/seller/dashboard" />} />
                        </Routes>
                      </div>
                    </div>
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <div className="admin-layout">
                      <AdminNavigation />
                      <div className="admin-content">
                        <Routes>
                          <Route path="sellers" element={<AdminSellerListPage />} />
                          <Route
                            path="sellers/:sellerId"
                            element={<AdminSellerDetailPage />}
                          />
                          <Route path="*" element={<Navigate to="/admin/sellers" />} />
                        </Routes>
                      </div>
                    </div>
                  </ProtectedRoute>
                }
              />

              {/* Redirects */}
              <Route path="/" element={<Navigate to="/seller/login" />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
