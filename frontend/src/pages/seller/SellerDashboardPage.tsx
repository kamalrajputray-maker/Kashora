import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sellerAPI, SellerDashboard } from '../../services/api';
import { Grid, Card, CardContent, Typography, Box, Button } from '@mui/material';
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
    } catch (err) {
      setError('Failed to load dashboard');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="loading-container">Loading dashboard...</div>;
  }
  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }
  if (!dashboard) {
    return <div className="error-container">No dashboard data.</div>;
  }

  const stats = [
    { label: 'Total Products', value: dashboard.total_products },
    { label: 'Active Orders', value: dashboard.active_orders },
    { label: 'Revenue', value: dashboard.revenue },
    { label: 'Low Stock Items', value: dashboard.low_stock_products },
  ];

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h4" gutterBottom>
        Seller Dashboard
      </Typography>
      <Grid container spacing={3}>
        {stats.map((item, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card elevation={2} sx={{
  height: '100%',
  background: {
    'Total Products': '#4f46e5',
    'Active Orders': '#10b981',
    'Revenue': '#f59e0b',
    'Low Stock Items': '#ef4444'
  }[item.label] ?? '#374151',
  color: '#fff',
  borderRadius: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
}}>
  <CardContent>
    <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
      {item.label}
    </Typography>
    <Typography variant="h5" sx={{ fontWeight: '600', mt: 0.5 }}>
      {item.value}
    </Typography>
  </CardContent>
</Card>

          </Grid>
        ))}
      </Grid>
      <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button component={Link} to="/seller/products" variant="contained" color="primary">
          Manage Products
        </Button>
        <Button component={Link} to="/seller/orders" variant="outlined" color="primary">
          View Orders
        </Button>
        <Button component={Link} to="/seller/profile" variant="contained" color="secondary">
          Edit Profile
        </Button>
      </Box>
    </Box>
  );
};

export default SellerDashboardPage;
