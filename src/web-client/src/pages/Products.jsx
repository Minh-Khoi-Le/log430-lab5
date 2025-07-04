/**
 * Products Page
 * 
 * Clean, academic-focused product catalog with clear data presentation
 */

import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { apiFetch, API_ENDPOINTS } from '../api';
import ProductList from '../components/ProductList';
import Modal from '../components/Modal';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  InputAdornment,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

function Products() {
  const { user } = useUser();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');


  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, selectedCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Try to fetch products from API, fallback to sample data
      try {
        const response = await apiFetch(API_ENDPOINTS.PRODUCTS.BASE);
        const productsData = response.success ? response.data : response;
        const products = productsData.products || productsData;
        
        if (Array.isArray(products) && products.length > 0) {
          setProducts(products);
        } else {
          // Fallback to sample data if no products from API
          setProducts(sampleProducts);
        }
      } catch (apiError) {
        console.error('API Error, using sample data:', apiError);
        // Use sample data as fallback
        setProducts(sampleProducts);
      }
      
      setLoading(false);
      
    } catch (error) {
      setError('Failed to load products. Please try again.');
      console.error('Error fetching products:', error);
      setProducts(sampleProducts); // Fallback to sample data
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  };

  const handleEditProduct = (product) => {
    console.log('Edit product:', product);
  };

  const handleDeleteProduct = (product) => {
    console.log('Delete product:', product);
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
      {/* Header with title and filters */}
      <Paper elevation={1} sx={{ mx: 4, mt: 4, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6">
            Product Catalog
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={fetchProducts}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            {user?.role === 'gestionnaire' && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setShowAddModal(true)}
              >
                Add Product
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Main content area with product listing */}
      <div style={{
        margin: "20px 28px 0 28px",
        padding: "20px 0",
        minHeight: "60vh"
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4, gap: 2 }}>
            <CircularProgress size={50} />
            <Typography>Loading products...</Typography>
            {error && (
              <Typography variant="body2" color="text.secondary">
                Retrying connection...
              </Typography>
            )}
          </Box>
        ) : (
          <>
            {/* Search and Filter Controls */}
            <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Product List */}
            <ProductList
              products={filteredProducts}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              userRole={user?.role}
            />
          </>
        )}
      </div>

      {/* Add Product Modal */}
      <Modal
        open={showAddModal}
        title="Add New Product"
        onClose={() => setShowAddModal(false)}
        onConfirm={() => {
          setShowAddModal(false);
        }}
      >
        <Typography>Product creation form would be implemented here.</Typography>
      </Modal>
    </div>
  );
}

export default Products;
