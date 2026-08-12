import React from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/seller.css';

const BuyerDashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard-container" style={{ padding: '2rem' }}>
      <div className="dashboard-header">
        <h1>🛍️ Welcome to Kashora, {user?.first_name}!</h1>
        <p>This is your buyer dashboard.</p>
      </div>

      <div className="dashboard-section">
        <h2>Your Orders</h2>
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No orders yet</h3>
          <p>Start shopping to see your orders here.</p>
        </div>
      </div>
    </div>
  );
};

export default BuyerDashboardPage;
