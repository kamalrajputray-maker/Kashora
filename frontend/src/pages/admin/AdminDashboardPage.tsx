import React from 'react';
import { Card, CardContent, Typography, Grid } from '@mui/material';

// Simple placeholder KPI cards for Admin dashboard
export default function AdminDashboardPage() {
  const stats = [
    { label: 'Total Sellers', value: 0 },
    { label: 'Approved Sellers', value: 0 },
    { label: 'Pending Sellers', value: 0 },
    { label: 'Total Buyers', value: 0 },
    { label: 'Total Products', value: 0 },
    { label: 'Pending Products', value: 0 },
    { label: 'Total Orders', value: 0 },
    { label: 'Pending Orders', value: 0 },
  ];

  return (
    <Grid container spacing={3}>
      {stats.map((item, idx) => (
        <Grid item xs={12} sm={6} md={3} lg={2} key={idx}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{item.label}</Typography>
              <Typography variant="h4" color="primary">{item.value}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
