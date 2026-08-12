import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sellerAPI, SellerDashboard } from '../../services/api';
import '../../styles/seller.css';

const SellerDashboardPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<SellerDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const response = await sellerAPI.getDashboard();
      setDashboard(response.data);
      setError(null);
    } catch (err: any) {
      setError('Failed to load dashboard');
      console.error('Error fetching dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="loading-container">Loading dashboard...</div>;
  }

  if (!dashboard) {
    return <div className="error-container">Failed to load dashboard</div>;
  }

  return (
    <div className="seller-dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome to your seller dashboard</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Status Overview */}
      <section className="dashboard-section">
        <h2>Store Status</h2>
        <div className="status-card">
          <div className="status-info">
            <h3>Current Status</h3>
            <div
              className="status-badge"
              style={{ backgroundColor: getStatusColor(dashboard.status) }}
            >
              {dashboard.status_display}
            </div>
          </div>

          <div className="status-actions">
            <Link to="/seller/profile" className="btn btn-primary">
              View Profile
            </Link>
            <Link to="/seller/profile" className="btn btn-secondary">
              Edit Profile
            </Link>
          </div>
        </div>
      </section>

      {/* Product Statistics */}
      <section className="dashboard-section">
        <h2>Product Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{dashboard.total_products}</div>
            <div className="stat-label">Total Products</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{dashboard.approved_products}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{dashboard.pending_products}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{dashboard.rejected_products}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>
      </section>

      {/* Inventory Statistics */}
      <section className="dashboard-section">
        <h2>Inventory Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{dashboard.total_inventory}</div>
            <div className="stat-label">Total Inventory</div>
          </div>
          <div className="stat-card alert-warning">
            <div className="stat-number">{dashboard.low_stock_products}</div>
            <div className="stat-label">Low Stock Items</div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="dashboard-section">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <Link to="/seller/products" className="action-card">
            <div className="action-icon">➕</div>
            <div className="action-title">Add Product</div>
            <div className="action-desc">Create a new product listing</div>
          </Link>

          <Link to="/seller/products" className="action-card">
            <div className="action-icon">📦</div>
            <div className="action-title">View Products</div>
            <div className="action-desc">Manage your product listings</div>
          </Link>

          <Link to="/seller/profile" className="action-card">
            <div className="action-icon">👤</div>
            <div className="action-title">Edit Profile</div>
            <div className="action-desc">Update your store information</div>
          </Link>

          <Link to="/seller/orders" className="action-card">
            <div className="action-icon">🛒</div>
            <div className="action-title">View Orders</div>
            <div className="action-desc">See your recent orders</div>
          </Link>
        </div>
      </section>

      {/* Notifications */}
      {dashboard.status !== 'APPROVED' && (
        <section className="dashboard-section">
          <div className="alert alert-info">
            <h3>Store Status Information</h3>
            {dashboard.status === 'PENDING' && (
              <p>
                Your store is pending approval. Our team will review your information and
                contact you shortly.
              </p>
            )}
            {dashboard.status === 'REJECTED' && (
              <p>
                Your store application was rejected. Please review the feedback in your profile
                and resubmit.
              </p>
            )}
            {dashboard.status === 'SUSPENDED' && (
              <p>Your store has been suspended. Please contact support for more information.</p>
            )}
            {dashboard.status === 'BLOCKED' && (
              <p>Your store has been blocked. Please contact support for more information.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

function getStatusColor(status: string): string {
  const colors: { [key: string]: string } = {
    PENDING: '#FFC107',
    APPROVED: '#28A745',
    REJECTED: '#DC3545',
    SUSPENDED: '#FF9800',
    BLOCKED: '#6F42C1',
  };
  return colors[status] || '#6C757D';
}

export default SellerDashboardPage;
