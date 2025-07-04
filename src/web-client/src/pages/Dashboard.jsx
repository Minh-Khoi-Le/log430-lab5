/**
 * Dashboard Page for Admin Users
 * 
 * This page provides an overview dashboard for gestionnaire (admin) users
 * with system statistics and management tools.
 * Kong API Gateway Integration:
 * - GET /dashboard/stats -> catalog-service (requires authentication)
 */

import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { authenticatedFetch, API_ENDPOINTS } from '../api';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Store as StoreIcon,
  Inventory as InventoryIcon,
  AttachMoney as SalesIcon,
  Assessment as ReportsIcon,
} from '@mui/icons-material';

function Dashboard() {
  const { user } = useUser();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sample dashboard data
  const sampleStats = {
    totalStores: 3,
    totalProducts: 12,
    totalSales: 45,
    totalRevenue: 15420.50,
    lowStockItems: 5,
    pendingRefunds: 2
  };

  useEffect(() => {
    if (user?.token) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user?.token) {
      setError('Authentication required to view dashboard data.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Try to fetch dashboard data from API, fallback to sample data
      try {
        console.log('Fetching dashboard data via Kong Gateway:', API_ENDPOINTS.DASHBOARD.STATS);
        const response = await authenticatedFetch(API_ENDPOINTS.DASHBOARD.STATS, user.token);
        const dashboardData = response.success ? response.data : response;
        setStats(dashboardData || sampleStats);
      } catch (apiError) {
        console.error('Kong Gateway API Error, using sample data:', apiError);
        if (apiError.message.includes('401')) {
          setError('Authentication failed. Please log in again.');
          return;
        } else if (apiError.message.includes('403')) {
          setError('Access denied. You need gestionnaire permissions to view dashboard.');
          return;
        }
        // Use sample data as fallback for other errors
        setStats(sampleStats);
      }
      
      setLoading(false);
      
    } catch (error) {
      setError('Failed to load dashboard data.');
      console.error('Error fetching dashboard data:', error);
      setStats(sampleStats); // Fallback to sample data
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress size={50} />
        </Box>
      </Container>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f6f6f6",
      fontFamily: "sans-serif",
      position: "relative"
    }}>
      {/* Header */}
      <Paper elevation={1} sx={{ mx: 4, mt: 4, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <DashboardIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          <Box>
            <Typography variant="h6" fontWeight="600" color="text.primary">
              Admin Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Welcome back, {user?.name}. Here's your system overview.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Main content */}
      <div style={{
        margin: "20px 28px 0 28px",
        padding: "20px 0",
        minHeight: "60vh"
      }}>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Dashboard Statistics */}
      <Grid container spacing={3}>
        {/* Total Stores */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Stores
                  </Typography>
                  <Typography variant="h4" fontWeight="600">
                    {stats?.totalStores || 0}
                  </Typography>
                </Box>
                <StoreIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Products */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Products
                  </Typography>
                  <Typography variant="h4" fontWeight="600">
                    {stats?.totalProducts || 0}
                  </Typography>
                </Box>
                <InventoryIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Sales */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Sales
                  </Typography>
                  <Typography variant="h4" fontWeight="600">
                    {stats?.totalSales || 0}
                  </Typography>
                </Box>
                <SalesIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Revenue */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4" fontWeight="600">
                    ${(stats?.totalRevenue || 0).toFixed(2)}
                  </Typography>
                </Box>
                <ReportsIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Low Stock Items */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Low Stock Items
                  </Typography>
                  <Typography variant="h4" fontWeight="600" color="error.main">
                    {stats?.lowStockItems || 0}
                  </Typography>
                </Box>
                <InventoryIcon sx={{ fontSize: 40, color: 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Refunds */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Pending Refunds
                  </Typography>
                  <Typography variant="h4" fontWeight="600" color="warning.main">
                    {stats?.pendingRefunds || 0}
                  </Typography>
                </Box>
                <ReportsIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

        {/* Quick Actions */}
        <Paper elevation={1} sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use the navigation menu above to access different management sections:
            Dashboard, Stores, Inventory, Sales, and Refunds.
          </Typography>
        </Paper>
      </div>
    </div>
  );
}

export default Dashboard;
