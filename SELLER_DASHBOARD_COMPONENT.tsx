import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface DashboardStats {
  status: string;
  total_products: number;
  approved_products: number;
  pending_products: number;
  rejected_products: number;
  total_inventory: number;
  low_stock_products: number;
}

interface DashboardData {
  id: string;
  user_phone: string;
  business_name: string;
  status_display: string;
  dashboard: DashboardStats;
}

interface SellerDashboardProps {
  token: string;
}

const SellerDashboard: React.FC<SellerDashboardProps> = ({ token }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/seller/dashboard/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setDashboardData(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard');
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!dashboardData) return <div>No data available</div>;

  const stats = dashboardData.dashboard;

  return (
    <div className="seller-dashboard">
      <div className="dashboard-header">
        <h1>Seller Dashboard</h1>
        <p className="subtitle">Welcome, {dashboardData.business_name}</p>
      </div>

      {/* Store Status Section */}
      <section className="status-section">
        <h2>Store Status</h2>
        <div className="status-card">
          <div className={`status-badge status-${stats.status.toLowerCase()}`}>
            {stats.status}
          </div>
          <p className="status-info">
            Your store is currently <strong>{stats.status}</strong>
          </p>
        </div>
      </section>

      {/* Products Section */}
      <section className="products-section">
        <h2>Products Overview</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon icon-total">📦</div>
            <div className="stat-content">
              <p className="stat-label">Total Products</p>
              <p className="stat-value">{stats.total_products}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon icon-approved">✅</div>
            <div className="stat-content">
              <p className="stat-label">Approved Products</p>
              <p className="stat-value">{stats.approved_products}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon icon-pending">⏳</div>
            <div className="stat-content">
              <p className="stat-label">Pending Products</p>
              <p className="stat-value">{stats.pending_products}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon icon-rejected">❌</div>
            <div className="stat-content">
              <p className="stat-label">Rejected Products</p>
              <p className="stat-value">{stats.rejected_products}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Inventory Section */}
      <section className="inventory-section">
        <h2>Inventory Overview</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon icon-inventory">📊</div>
            <div className="stat-content">
              <p className="stat-label">Total Inventory</p>
              <p className="stat-value">{stats.total_inventory}</p>
            </div>
          </div>

          <div className="stat-card warning">
            <div className="stat-icon icon-low-stock">⚠️</div>
            <div className="stat-content">
              <p className="stat-label">Low Stock Products</p>
              <p className="stat-value">{stats.low_stock_products}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button className="btn btn-primary">Add Product</button>
          <button className="btn btn-secondary">View Products</button>
          <button className="btn btn-secondary">Edit Profile</button>
          <button className="btn btn-secondary">View Orders</button>
        </div>
      </section>
    </div>
  );
};

export default SellerDashboard;
