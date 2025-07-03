import axios from 'axios';

// API Base URL - using proxy in development, direct in production
const API_BASE_URL = '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'frontend-app-key-12345'
  },
});

// Product API calls
export const getProducts = async () => {
  try {
    const response = await apiClient.get('/api/products');
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

export const getProduct = async (id: string) => {
  try {
    const response = await apiClient.get(`/api/products/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

export const createProduct = async (productData: any) => {
  try {
    const response = await apiClient.post('/api/products', productData);
    return response.data;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

export const updateProduct = async (id: string, productData: any) => {
  try {
    const response = await apiClient.put(`/api/products/${id}`, productData);
    return response.data;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const response = await apiClient.delete(`/api/products/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

export const searchProducts = async (query: string) => {
  try {
    const response = await apiClient.get(`/api/products/search?name=${query}`);
    return response.data;
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
};

// Store API calls
export const getStores = async () => {
  try {
    const response = await apiClient.get('/api/stores');
    return response.data;
  } catch (error) {
    console.error('Error fetching stores:', error);
    throw error;
  }
};

export const getStore = async (id: string) => {
  try {
    const response = await apiClient.get(`/api/stores/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching store:', error);
    throw error;
  }
};

export const createStore = async (storeData: any) => {
  try {
    const response = await apiClient.post('/api/stores', storeData);
    return response.data;
  } catch (error) {
    console.error('Error creating store:', error);
    throw error;
  }
};

// Stock API calls
export const getStock = async () => {
  try {
    const response = await apiClient.get('/api/stock');
    return response.data;
  } catch (error) {
    console.error('Error fetching stock:', error);
    throw error;
  }
};

export const getStockByStore = async (storeId: string) => {
  try {
    const response = await apiClient.get(`/api/stock/store/${storeId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching stock by store:', error);
    throw error;
  }
};

export const getStockByProduct = async (productId: string) => {
  try {
    const response = await apiClient.get(`/api/stock/product/${productId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching stock by product:', error);
    throw error;
  }
};

export const updateStock = async (id: string, stockData: any) => {
  try {
    const response = await apiClient.put(`/api/stock/${id}`, stockData);
    return response.data;
  } catch (error) {
    console.error('Error updating stock:', error);
    throw error;
  }
};

export const getLowStockItems = async () => {
  try {
    const response = await apiClient.get('/api/stock/low');
    return response.data;
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    throw error;
  }
};

// User API calls
export const getUsers = async () => {
  try {
    const response = await apiClient.get('/api/users');
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const createUser = async (userData: any) => {
  try {
    const response = await apiClient.post('/api/users', userData);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Sales API calls
export const getSales = async () => {
  try {
    const response = await apiClient.get('/api/sales');
    return response.data;
  } catch (error) {
    console.error('Error fetching sales:', error);
    throw error;
  }
};

export const getSale = async (id: string) => {
  try {
    const response = await apiClient.get(`/api/sales/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching sale:', error);
    throw error;
  }
};

export const createSale = async (saleData: any) => {
  try {
    const response = await apiClient.post('/api/sales', saleData);
    return response.data;
  } catch (error) {
    console.error('Error creating sale:', error);
    throw error;
  }
};

export const updateSaleStatus = async (id: string, status: string) => {
  try {
    const response = await apiClient.put(`/api/sales/${id}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating sale status:', error);
    throw error;
  }
};

export const getSalesByUser = async (userId: string) => {
  try {
    const response = await apiClient.get(`/api/sales/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching sales by user:', error);
    throw error;
  }
};

export const getSalesByStore = async (storeId: string) => {
  try {
    const response = await apiClient.get(`/api/sales/store/${storeId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching sales by store:', error);
    throw error;
  }
};

export const getSalesSummary = async (startDate: string, endDate: string) => {
  try {
    const response = await apiClient.get(`/api/sales/summary?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    throw error;
  }
};

// Refunds API calls
export const getRefunds = async () => {
  try {
    const response = await apiClient.get('/api/refunds');
    return response.data;
  } catch (error) {
    console.error('Error fetching refunds:', error);
    throw error;
  }
};

export const getRefund = async (id: string) => {
  try {
    const response = await apiClient.get(`/api/refunds/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching refund:', error);
    throw error;
  }
};

export const createRefund = async (refundData: any) => {
  try {
    const response = await apiClient.post('/api/refunds', refundData);
    return response.data;
  } catch (error) {
    console.error('Error creating refund:', error);
    throw error;
  }
};

export const getRefundsByUser = async (userId: string) => {
  try {
    const response = await apiClient.get(`/api/refunds/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching refunds by user:', error);
    throw error;
  }
};

export const getRefundsByStore = async (storeId: string) => {
  try {
    const response = await apiClient.get(`/api/refunds/store/${storeId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching refunds by store:', error);
    throw error;
  }
};

export const getRefundsBySale = async (saleId: string) => {
  try {
    const response = await apiClient.get(`/api/refunds/sale/${saleId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching refunds by sale:', error);
    throw error;
  }
};

export const getRefundsSummary = async (startDate: string, endDate: string) => {
  try {
    const response = await apiClient.get(`/api/refunds/summary?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching refunds summary:', error);
    throw error;
  }
};

export default {
  // Product methods
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  // Store methods
  getStores,
  getStore,
  createStore,
  // Stock methods
  getStock,
  getStockByStore,
  getStockByProduct,
  updateStock,
  getLowStockItems,
  // User methods
  getUsers,
  createUser,
  // Sales methods
  getSales,
  getSale,
  createSale,
  updateSaleStatus,
  getSalesByUser,
  getSalesByStore,
  getSalesSummary,
  // Refunds methods
  getRefunds,
  getRefund,
  createRefund,
  getRefundsByUser,
  getRefundsByStore,
  getRefundsBySale,
  getRefundsSummary,
};