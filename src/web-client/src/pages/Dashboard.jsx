/**
 * Dashboard Page for Admin Users
 * 
 * This page provides an overview dashboard for admin users
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
        console.log('Fetching dashboard data via Kong Gateway...');
        
        // Fetch actual data from multiple endpoints
        const [salesResponse, storesResponse, productsResponse, stockResponse, refundsResponse] = await Promise.all([
          authenticatedFetch(API_ENDPOINTS.SALES.BASE, user.token).catch(err => {
            console.warn('Sales API error:', err);
            return { data: [] };
          }),
          authenticatedFetch(API_ENDPOINTS.STORES.BASE, user.token).catch(err => {
            console.warn('Stores API error:', err);
            return { data: [] };
          }),
          authenticatedFetch(API_ENDPOINTS.PRODUCTS.BASE, user.token).catch(err => {
            console.warn('Products API error:', err);
            return { data: [] };
          }),
          authenticatedFetch(API_ENDPOINTS.STOCK.BASE, user.token).catch(err => {
            console.warn('Stock API error:', err);
            return { data: [] };
          }),
          authenticatedFetch(API_ENDPOINTS.REFUNDS.BASE, user.token).catch(err => {
            console.warn('Refunds API error:', err);
            return { data: [] };
          })
        ]);
        
        // Extract data arrays with better error handling
        let salesData = [];
        if (Array.isArray(salesResponse?.data)) {
          salesData = salesResponse.data;
        } else if (Array.isArray(salesResponse)) {
          salesData = salesResponse;
        }
        
        let storesData = [];
        if (Array.isArray(storesResponse?.data)) {
          storesData = storesResponse.data;
        } else if (Array.isArray(storesResponse)) {
          storesData = storesResponse;
        }
        
        const productsData = productsResponse?.data?.products || productsResponse?.products || 
                            (Array.isArray(productsResponse?.data) ? productsResponse.data : []) ||
                            (Array.isArray(productsResponse) ? productsResponse : []);
        const stockData = stockResponse?.data?.inventory || stockResponse?.inventory || 
                         (Array.isArray(stockResponse?.data) ? stockResponse.data : []) ||
                         (Array.isArray(stockResponse) ? stockResponse : []);
        
        console.log('Fetched data:', { salesData: salesData.length, storesData: storesData.length, productsData: productsData.length, stockData: stockData.length });
        
        // Calculate dashboard stats from real data
        const totalStores = storesData.length;
        const totalProducts = productsData.length;
        const totalSales = salesData.length;
        const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.total || sale.totalAmount || 0), 0);
        
        // Calculate refunds data from real data
        const refundsData = refundsResponse?.data || refundsResponse || [];
        const pendingRefunds = refundsData.filter(refund => refund.status === 'pending').length;
        const totalRefunds = refundsData.length;
        const totalRefundAmount = refundsData.reduce((sum, refund) => sum + (refund.total || refund.refundAmount || 0), 0);
        
        // Create store map for aggregation
        const storeMap = {};
        storesData.forEach(store => {
          storeMap[store.id] = store.name;
        });
        
        // Aggregate sales by store
        const storeStats = {};
        salesData.forEach(sale => {
          const storeId = sale.storeId;
          if (!storeStats[storeId]) {
            storeStats[storeId] = {
              storeId,
              storeName: storeMap[storeId] || `Store ${storeId}`,
              totalSales: 0,
              revenue: 0,
              totalRefunds: 0,
              refundAmount: 0,
              netRevenue: 0
            };
          }
          storeStats[storeId].totalSales += 1;
          storeStats[storeId].revenue += sale.total || sale.totalAmount || 0;
        });

        // Aggregate refunds by store
        refundsData.forEach(refund => {
          const storeId = refund.storeId || (refund.sale && refund.sale.storeId);
          if (storeId && storeStats[storeId]) {
            storeStats[storeId].totalRefunds += 1;
            storeStats[storeId].refundAmount += refund.total || refund.refundAmount || 0;
          }
        });

        // Calculate net revenue for each store
        Object.values(storeStats).forEach(store => {
          store.netRevenue = store.revenue - store.refundAmount;
        });
        
        // Add stores with no sales
        storesData.forEach(store => {
          if (!storeStats[store.id]) {
            storeStats[store.id] = {
              storeId: store.id,
              storeName: store.name,
              totalSales: 0,
              revenue: 0,
              totalRefunds: 0,
              refundAmount: 0,
              netRevenue: 0
            };
          }
        });
        
        const salesByStore = Object.values(storeStats);
        
        const realDashboardData = {
          totalStores,
          totalProducts,
          totalSales,
          totalRevenue,
          pendingRefunds,
          totalRefunds,
          totalRefundAmount,
          salesByStore
        };
        
        console.log('Real dashboard data:', realDashboardData);
        setStats(realDashboardData);
        
      } catch (apiError) {
        console.error('Kong Gateway API Error, using sample data:', apiError);
        if (apiError.message.includes('401')) {
          setError('Authentication failed. Please log in again.');
          return;
        } else if (apiError.message.includes('403')) {
          setError('Access denied. You need admin permissions to view dashboard.');
          return;
        }
        // Use sample data as fallback for other errors
        setStats({
          ...sampleStats,
          salesByStore: sampleStats.salesByStore
        });
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
    <div
      style={{
        minHeight: "100vh",
        width: '100vw',
        overflowX: 'hidden',
        background: "#f6f6f6",
        fontFamily: "sans-serif",
        position: "relative",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Paper elevation={1} sx={{ mx: 4, mt: 4, p: 2, width: '100%', maxWidth: 1200 }}>
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
        minHeight: "60vh",
        width: '100%',
        maxWidth: 1200,
        boxSizing: 'border-box',
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

        {/* Total Refunds */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Refunds
                  </Typography>
                  <Typography variant="h4" fontWeight="600" color="error.main">
                    {stats?.totalRefunds || 0}
                  </Typography>
                </Box>
                <ReportsIcon sx={{ fontSize: 40, color: 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Net Revenue */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Net Revenue
                  </Typography>
                  <Typography variant="h4" fontWeight="600" color="success.main">
                    ${((stats?.totalRevenue || 0) - (stats?.totalRefundAmount || 0)).toFixed(2)}
                  </Typography>
                </Box>
                <SalesIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sales by Store Table */}
      {stats?.salesByStore && Array.isArray(stats.salesByStore) && stats.salesByStore.length > 0 && (
        <Paper elevation={1} sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Sales by Store
          </Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ background: '#f6f6f6' }}>
                  <th style={{ padding: '10px 8px', borderBottom: '2px solid #e0e0e0', textAlign: 'left' }}>Store</th>
                  <th style={{ padding: '10px 8px', borderBottom: '2px solid #e0e0e0', textAlign: 'right' }}>Total Sales</th>
                  <th style={{ padding: '10px 8px', borderBottom: '2px solid #e0e0e0', textAlign: 'right' }}>Revenue</th>
                  <th style={{ padding: '10px 8px', borderBottom: '2px solid #e0e0e0', textAlign: 'right' }}>Refunds</th>
                  <th style={{ padding: '10px 8px', borderBottom: '2px solid #e0e0e0', textAlign: 'right' }}>Refund Amount</th>
                  <th style={{ padding: '10px 8px', borderBottom: '2px solid #e0e0e0', textAlign: 'right' }}>Net Revenue</th>
                </tr>
              </thead>
              <tbody>
                {stats.salesByStore.map((store) => (
                  <tr key={store.storeId}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{store.storeName}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{store.totalSales || 0}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>${(store.revenue || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{store.totalRefunds || 0}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>${(store.refundAmount || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right', fontWeight: 'bold' }}>${(store.netRevenue || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Paper>
      )}

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
