/**
 * Products Page
 * 
 * This component displays the product catalog and provides product management
 * functionality for administrators (gestionnaire role).
 * 
 */

import React, { useEffect, useState } from "react";
import ProductList from "../components/ProductList";
import Modal from "../components/Modal";
import ProductEditForm from "../components/ProductEditForm";
import { useUser } from "../context/UserContext";
import { authenticatedFetch, API_ENDPOINTS } from "../api";
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

  const { user } = useUser();

  /**
   * Fetch products from the API
   * 
   * Retrieves the product catalog from the backend and updates state
   */
  const fetchProducts = async () => {
    try {
      const data = await authenticatedFetch(API_ENDPOINTS.PRODUCTS.BASE, user.token);
      setProducts(data);
    } catch (error) {
      console.error("Erreur:", error);
      setError(error.message || "Error loading products");
    }
  };

  // Load products when component mounts
  useEffect(() => {
    fetchProducts();
  }, []);

  /**
   * Product Management Functions
   * 
   * These functions handle CRUD operations for products
   * Only available to users with gestionnaire role
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
      console.error("Erreur:", err);
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
        price: editedProduct.price,
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
      console.error("Erreur:", err);
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
      </Paper>

      {/* Main content area with product listing */}
      <div style={{
        margin: "20px 28px 0 28px",
        background: "#666",
        borderRadius: 4,
        padding: "40px 12px 60px 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        minHeight: 450,
        boxSizing: "border-box",
      }}>
        {/* Product list with conditional edit/delete actions based on user role */}
        <ProductList
          products={products}
          onDelete={user.role === "gestionnaire" ? handleDelete : undefined}
          onEdit={user.role === "gestionnaire" ? handleEdit : undefined}
          hideUnavailable={hideUnavailable}
        />

        {/* Modal for product editing */}
        <Modal
          open={editModalOpen}
          title="Edit Product"
          onClose={cancelEdit}
        >
          <ProductEditForm
            product={productToEdit}
            onSave={saveEdit}
            onCancel={cancelEdit}
          />
        </Modal>
        
        {/* Modal for adding new product */}
        <Modal
          open={addModalOpen}
          title="Add New Product"
          onClose={handleCloseAddModal}
        >
          <ProductEditForm
            product={{ name: "", price: 0, stocks: [] }}
            onSave={handleAddProduct}
            onCancel={handleCloseAddModal}
            isNewProduct
          />
        </Modal>
        
        {/* Confirmation modal for product deletion */}
        <Modal
          open={modalOpen}
          title="Delete Confirmation"
          onClose={cancelDelete}
          onConfirm={confirmDelete}
        >
          <div style={{ margin: "16px 0 0 0" }}>
            Are you sure you want to delete <b>{productToDelete?.name}</b>?
          </div>
        </Modal>
        
        {/* Error Snackbar */}
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={handleCloseError}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleCloseError} 
            severity="error" 
            sx={{ width: '100%' }}
          >
            {error}
          </Alert>
        </Snackbar>
        
        {/* Floating action button for mobile */}
        {user?.role === "gestionnaire" && (
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
    </div>
  );
};

export default Products;
