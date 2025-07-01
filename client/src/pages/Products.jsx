/**
 * Products Page
 * 
 * This component displays the product catalog and provides product management
 * functionality for administrators (manager role).
 * 
 */

import React, { useEffect, useState, useCallback } from "react";
import ProductList from "../components/ProductList";
import Modal from "../components/Modal";
import ProductEditForm from "../components/ProductEditForm";
import { useUser } from "../context/UserContext";
import { authenticatedFetch, apiFetch, API_ENDPOINTS } from "../api";
import { 
  Box, 
  FormControlLabel, 
  Switch, 
  Typography, 
  Paper, 
  Alert,
  Snackbar,
  Button,
  Fab
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

const Products = () => {
  // State management for products and UI
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const [error, setError] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const { user } = useUser();

  /**
   * Fetch products from the API with retry logic
   * 
   * Retrieves the product catalog from the backend and updates state
   */
  const fetchProducts = useCallback(async (retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    try {
      setLoading(true);
      
      // Add timestamp to ensure fresh data (bypass any caching)
      const timestamp = Date.now();
      const url = `${API_ENDPOINTS.PRODUCTS.BASE}?t=${timestamp}`;
      
      // For authenticated users, use authenticatedFetch with token
      // For guests, use regular apiFetch
      let response;
      if (user?.token) {
        response = await authenticatedFetch(url, user.token);
      } else {
        response = await apiFetch(url);
      }
      
      // Handle structured API response
      const data = response.success ? response.data : response;
      
      // Ensure data is an array
      if (!Array.isArray(data)) {
        throw new Error('Invalid API response: expected an array of products');
      }
      
      console.log('Fetched products data:', data.length, 'products');
      console.log('Sample product with stock:', data[0] ? {
        id: data[0].id,
        name: data[0].name,
        stocks: data[0].stocks
      } : 'No products found');
      
      // Products already include stock information, no need for separate API calls
      setProducts(data);
      setError(null);
    } catch (error) {
      console.error("Error loading products:", error);
      
      // Handle specific error cases
      let errorMessage = error.message || "Failed to load products";
      
      if (error.message.includes('502') && retryCount < maxRetries) {
        // Retry on 502 errors (Gateway issues)
        console.log(`Retrying... Attempt ${retryCount + 1} of ${maxRetries}`);
        setTimeout(() => {
          fetchProducts(retryCount + 1);
        }, retryDelay * (retryCount + 1)); // Exponential backoff
        return;
      } else if (error.message.includes('502')) {
        errorMessage = "Service temporarily unavailable. Please try refreshing the page.";
      } else if (error.message.includes('401')) {
        errorMessage = "Authentication required. Please log in to continue.";
      } else if (error.message.includes('403')) {
        errorMessage = "Access denied. You don't have permission to view products.";
      } else if (error.message.includes('500')) {
        errorMessage = "Server error. Please try again later.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  // Load products when component mounts and listen for stock updates
  useEffect(() => {
    console.log('Products page mounted, fetching initial product data...');
    fetchProducts();
    
    // Listen for stock update events from successful purchases
    const handleStockUpdate = (event) => {
      console.log('Stock updated event received!', event.detail);
      console.log('Stock updated for products:', event.detail?.productIds);
      console.log('Refreshing product data to reflect updated stock levels...');
      // Refresh products to show updated stock levels
      fetchProducts();
    };
    
    console.log('Adding stock update event listener...');
    window.addEventListener('stockUpdated', handleStockUpdate);
    
    // Cleanup event listener on component unmount
    return () => {
      console.log('Removing stock update event listener...');
      window.removeEventListener('stockUpdated', handleStockUpdate);
    };
  }, [fetchProducts]);

  /**
   * Product Management Functions
   * 
   * These functions handle CRUD operations for products
   * Only available to users with manager role
   */
  
  // Delete product handling
  const handleDelete = product => {
    setProductToDelete(product);
    setModalOpen(true);
  };
  
  // Confirm product deletion
  const confirmDelete = async () => {
    try {
      setError(null);
      
      await authenticatedFetch(API_ENDPOINTS.PRODUCTS.BY_ID(productToDelete.id), user.token, {
        method: "DELETE",
      });
      
      setModalOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (err) {
      console.error("Error:", err);
      let errorMessage = err.message;
      
      // Handle specific error messages
      if (err.message.includes('409') || err.message.includes('constraint')) {
        errorMessage = "This product cannot be deleted because it is being used in stocks or sales.";
      } else if (err.message.includes('401')) {
        errorMessage = "You are not authorized to perform this action. Please log in again.";
      } else if (err.message.includes('403')) {
        errorMessage = "You don't have the necessary permissions for this action.";
      }
      
      setError(errorMessage);
      setModalOpen(false);
    }
  };
  
  // Cancel product deletion
  const cancelDelete = () => {
    setModalOpen(false);
    setProductToDelete(null);
  };
  
  // Edit product handling
  const handleEdit = product => {
    setProductToEdit(product);
    setEditModalOpen(true);
  };
  
  // Save product edits
  const saveEdit = async editedProduct => {
    try {
      // Create a copy of the product with only the fields we want to update
      const productToUpdate = {
        name: editedProduct.name,
        price: parseFloat(editedProduct.price),
        description: editedProduct.description
      };
      
      await authenticatedFetch(API_ENDPOINTS.PRODUCTS.BY_ID(editedProduct.id), user.token, {
        method: "PUT",
        body: JSON.stringify(productToUpdate),
      });
      
      setEditModalOpen(false);
      setProductToEdit(null);
      fetchProducts();
    } catch (err) {
      console.error("Error updating product:", err);
      let errorMessage = err.message;
      
      // Handle specific error messages
      if (err.message.includes('401')) {
        errorMessage = "You are not authorized to perform this action. Please log in again.";
      } else if (err.message.includes('403')) {
        errorMessage = "You don't have the necessary permissions for this action.";
      } else if (err.message.includes('400')) {
        errorMessage = "Validation error: Please check the required fields.";
      }
      
      setError(errorMessage);
    }
  };
  
  // Cancel product edit
  const cancelEdit = () => {
    setEditModalOpen(false);
    setProductToEdit(null);
  };
  
  // Open add product modal
  const handleOpenAddModal = () => {
    setAddModalOpen(true);
  };
  
  // Close add product modal
  const handleCloseAddModal = () => {
    setAddModalOpen(false);
  };
  
  // Add new product
  const handleAddProduct = async (newProduct) => {
    try {
      setError(null);
      
      await authenticatedFetch(API_ENDPOINTS.PRODUCTS.BASE, user.token, {
        method: "POST",
        body: JSON.stringify({
          name: newProduct.name,
          price: parseFloat(newProduct.price),
          description: newProduct.description || ""
        }),
      });
      
      setAddModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error("Error:", err);
      let errorMessage = err.message;
      
      // Handle specific error messages
      if (err.message.includes('401')) {
        errorMessage = "You are not authorized to perform this action. Please log in again.";
      } else if (err.message.includes('403')) {
        errorMessage = "You don't have the necessary permissions for this action.";
      } else if (err.message.includes('400')) {
        errorMessage = "Validation error: Please check the required fields.";
      }
      
      setError(errorMessage);
    }
  };

  // Handle availability filter change
  const handleFilterChange = (event) => {
    setHideUnavailable(event.target.checked);
  };
  
  // Handle error snackbar close
  const handleCloseError = () => {
    setError(null);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f6f6f6",
      fontFamily: "sans-serif",
      position: "relative"
    }}>
      {/* Header with title and filters */}
      <Paper elevation={1} sx={{ mx: 4, mt: 4, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Product Catalog
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Refresh button */}
            <Button
              variant="outlined"
              onClick={() => fetchProducts()}
              disabled={loading}
              sx={{ minWidth: 'auto', px: 2 }}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            
            {user?.role === "client" ? (
              <FormControlLabel
                control={
                  <Switch 
                    checked={hideUnavailable}
                    onChange={handleFilterChange}
                    color="primary"
                  />
                }
                label="Show only available products"
                labelPlacement="start"
              />
            ) : (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenAddModal}
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
            <Typography>Loading products...</Typography>
            <Typography variant="body2" color="text.secondary">
              {error && "Retrying connection..."}
            </Typography>
          </Box>
        ) : (
          <ProductList
            products={products}
            onDelete={user?.role === "manager" ? handleDelete : null}
            onEdit={user?.role === "manager" ? handleEdit : null}
            hideUnavailable={hideUnavailable}
          />
        )}
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={modalOpen}
        onClose={cancelDelete}
        title="Delete Product"
      >
        <div>
          <p>Are you sure you want to delete <strong>{productToDelete?.name}</strong>?</p>
          <p style={{ fontSize: "0.8rem", color: "#666" }}>
            This action cannot be undone.
          </p>
          
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <button onClick={cancelDelete} style={{ padding: "8px 16px" }}>
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              style={{
                padding: "8px 16px",
                background: "#ff4444",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Product edit modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={cancelEdit}
        title="Edit Product"
      >
        {productToEdit && (
          <ProductEditForm
            product={productToEdit}
            onSave={saveEdit}
            onCancel={cancelEdit}
          />
        )}
      </Modal>

      {/* Add product modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={handleCloseAddModal}
        title="Add New Product"
      >
        <ProductEditForm
          product={{ name: "", price: "", description: "" }}
          onSave={handleAddProduct}
          onCancel={handleCloseAddModal}
          isNewProduct={true}
        />
      </Modal>

      {/* Error snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseError}
      >
        <Alert 
          onClose={handleCloseError} 
          severity="error" 
          sx={{ width: '100%' }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => {
                setError(null);
                fetchProducts();
              }}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Snackbar>

      {/* Add product floating action button (mobile view) */}
      {user?.role === "manager" && (
        <Fab 
          color="primary" 
          aria-label="add"
          onClick={handleOpenAddModal}
          sx={{ 
            position: 'fixed', 
            bottom: 16, 
            right: 16,
            display: { xs: 'flex', sm: 'none' } 
          }}
        >
          <AddIcon />
        </Fab>
      )}
    </div>
  );
};

export default Products;
