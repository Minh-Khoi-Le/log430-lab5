/**
 * Product Edit Form Component
 * 
 * This component provides a form for editing product details.
 * It's used by administrators (gestionnaire role) to modify product information.
 * 
 */

import React, { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Typography,
  Box,
  Button,
  CircularProgress,
  TextareaAutosize
} from "@mui/material";

/**
 * ProductEditForm Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.product - Product object to edit
 * @param {Function} props.onSave - Handler function called when save button is clicked
 * @param {Function} props.onCancel - Handler function called when cancel button is clicked
 * @param {boolean} [props.isNewProduct] - Whether this form is for creating a new product
 * @returns {JSX.Element} Product edit form
 */
const ProductEditForm = ({ product, onSave, onCancel, isNewProduct = false }) => {
  // Local state for form fields to enable controlled inputs
  const [form, setForm] = useState({ 
    name: "",
    price: 0,
    description: ""
  });
  
  // State for stock quantities by store
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Get user from context
  const { user } = useUser();

  // Initialize form with product data when component mounts or product changes
  useEffect(() => {
    if (product) {
      // Set base product data
      setForm({
        name: product.name || "",
        price: product.price || 0,
        description: product.description || ""
      });
      
      // Fetch all available stores and stock information for existing products
      if (product.id && !isNewProduct) {
        fetchStockData(product.id);
      }
    }
  }, [product, isNewProduct]);
  
  // Fetch stock data for this product
  const fetchStockData = async (productId) => {
    try {
      setLoading(true);
      
      // First fetch all stores to ensure we have stock entries for each
      const storesResponse = await fetch('http://localhost:3000/api/v1/stores');
      if (!storesResponse.ok) {
        throw new Error('Failed to fetch stores');
      }
      const stores = await storesResponse.json();
      
      // Then fetch current stock data
      const stockResponse = await fetch(`http://localhost:3000/api/v1/stocks/product/${productId}`);
      if (!stockResponse.ok) {
        throw new Error('Failed to fetch stock data');
      }
      const stockData = await stockResponse.json();
      
      // If we have no stock data, initialize with 0 quantity for each store
      if (stockData.length === 0) {
        const initialStocks = stores.map(store => ({
          id: `temp_${store.id}`,
          storeId: store.id,
          store: store,
          quantity: 0
        }));
        setStocks(initialStocks);
      } else {
        setStocks(stockData);
      }
    } catch (error) {
      console.error("Error fetching stock data:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle input field changes for product details
   * Updates the form state when any input value changes
   * 
   * @param {Event} e - Input change event
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  /**
   * Handle stock quantity change
   * Updates the stock quantity for a specific store
   * 
   * @param {number} stockId - Stock ID
   * @param {number} value - New quantity value
   */
  const handleStockChange = (stockId, value) => {
    const updatedStocks = stocks.map(stock => {
      if (stock.id === stockId) {
        return { ...stock, quantity: parseInt(value) || 0 };
      }
      return stock;
    });
    
    setStocks(updatedStocks);
  };
  
  /**
   * Save stock changes
   * Updates stock quantities on the server
   */
  const saveStockChanges = async () => {
    try {
      setLoading(true);
      setSaveSuccess(false);
      
      // Save stock changes for each store
      const promises = stocks.map(stock => 
        fetch(`http://localhost:3000/api/v1/stocks/product/${product.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({
            storeId: stock.storeId,
            quantity: stock.quantity || 0
          })
        })
      );
      
      await Promise.all(promises);
      setSaveSuccess(true);
      
      // Refresh stock data
      await fetchStockData(product.id);
    } catch (error) {
      console.error("Error saving stock changes:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle form submission
   * Validates inputs and calls the onSave handler with updated product data
   * 
   * @param {Event} e - Form submit event
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    // Validate required fields
    if (!form.name || form.price === "") {
      alert("Name and price are required!");
      return;
    }
    
    // Prepare product data
    const productData = {
      ...(isNewProduct ? {} : { id: product.id }),
      name: form.name,
      price: parseFloat(form.price),
      description: form.description
    };
    
    // Call save handler with product data
    onSave(productData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ minWidth: 280, width: '100%', maxWidth: 600 }}>
      {/* Product name field */}
      <div style={{ marginBottom: 18 }}>
        <label>Name<br/>
          <input
            name="name"
            value={form.name || ""}
            onChange={handleChange}
            style={{ width: "100%", padding: 6 }}
            required
            placeholder="Product name"
          />
        </label>
      </div>
      
      {/* Product price field */}
      <div style={{ marginBottom: 18 }}>
        <label>Price<br/>
          <input
            name="price"
            type="number"
            value={form.price || ""}
            onChange={handleChange}
            style={{ width: "100%", padding: 6 }}
            required
            placeholder="Product price"
            step="0.01"
            min="0"
          />
        </label>
      </div>
      
      {/* Product description field */}
      <div style={{ marginBottom: 18 }}>
        <label>Description<br/>
          <TextareaAutosize
            name="description"
            value={form.description || ""}
            onChange={handleChange}
            style={{ width: "100%", padding: 6, minHeight: 80 }}
            placeholder="Product description (optional)"
          />
        </label>
      </div>
      
      {/* Stock management section (only for existing products) */}
      {!isNewProduct && (
        <div style={{ marginTop: 24 }}>
          <Typography variant="h6" gutterBottom>
            Stock Management
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Store</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stocks.map((stock) => (
                      <TableRow key={stock.id}>
                        <TableCell>{stock.store.name}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            value={stock.quantity}
                            onChange={(e) => handleStockChange(stock.id, e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Button
                variant="contained"
                color="primary"
                onClick={saveStockChanges}
                disabled={loading}
                sx={{ mr: 1 }}
              >
                Update Stock
              </Button>
              
              {saveSuccess && (
                <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                  Stock updated successfully!
                </Typography>
              )}
            </>
          )}
        </div>
      )}
      
      {/* Form action buttons */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          color="secondary"
          onClick={onCancel}
          sx={{ mr: 1 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          type="submit"
        >
          {isNewProduct ? "Create Product" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
};

export default ProductEditForm;
