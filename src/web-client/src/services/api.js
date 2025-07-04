import axios from 'axios';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: process.env.NODE_ENV === 'development' ? 'http://localhost:8000/api' : '/api', // Use Kong in dev
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add authentication token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Service classes
export class UserService {
  static async getUsers() {
    const response = await apiClient.get('/users');
    return response.data;
  }

  static async getUserById(id) {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  }

  static async createUser(userData) {
    const response = await apiClient.post('/users', userData);
    return response.data;
  }

  static async updateUser(id, userData) {
    const response = await apiClient.put(`/users/${id}`, userData);
    return response.data;
  }

  static async deleteUser(id) {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  }

  static async login(credentials) {
    const response = await apiClient.post('/users/login', credentials);
    return response.data;
  }

  static async register(userData) {
    const response = await apiClient.post('/users/register', userData);
    return response.data;
  }
}

export class ProductService {
  static async getProducts() {
    const response = await apiClient.get('/products');
    return response.data;
  }

  static async getProductById(id) {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  }

  static async createProduct(productData) {
    const response = await apiClient.post('/products', productData);
    return response.data;
  }

  static async updateProduct(id, productData) {
    const response = await apiClient.put(`/products/${id}`, productData);
    return response.data;
  }

  static async deleteProduct(id) {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  }
}

export class StoreService {
  static async getStores() {
    const response = await apiClient.get('/stores');
    return response.data;
  }

  static async getStoreById(id) {
    const response = await apiClient.get(`/stores/${id}`);
    return response.data;
  }

  static async createStore(storeData) {
    const response = await apiClient.post('/stores', storeData);
    return response.data;
  }

  static async updateStore(id, storeData) {
    const response = await apiClient.put(`/stores/${id}`, storeData);
    return response.data;
  }

  static async deleteStore(id) {
    const response = await apiClient.delete(`/stores/${id}`);
    return response.data;
  }
}

export class InventoryService {
  static async getInventory() {
    const response = await apiClient.get('/inventory');
    return response.data;
  }

  static async getStoreInventory(storeId) {
    const response = await apiClient.get(`/inventory/store/${storeId}`);
    return response.data;
  }

  static async getProductInventory(productId) {
    const response = await apiClient.get(`/inventory/product/${productId}`);
    return response.data;
  }

  static async updateStock(stockData) {
    const response = await apiClient.put('/inventory/stock', stockData);
    return response.data;
  }
}

export class SalesService {
  static async getSales() {
    const response = await apiClient.get('/sales');
    return response.data;
  }

  static async getSaleById(id) {
    const response = await apiClient.get(`/sales/${id}`);
    return response.data;
  }

  static async getUserSales(userId) {
    const response = await apiClient.get(`/sales/user/${userId}`);
    return response.data;
  }

  static async createSale(saleData) {
    const response = await apiClient.post('/sales', saleData);
    return response.data;
  }

  static async updateSale(id, saleData) {
    const response = await apiClient.put(`/sales/${id}`, saleData);
    return response.data;
  }
}

export class RefundService {
  static async getRefunds() {
    const response = await apiClient.get('/refunds');
    return response.data;
  }

  static async getRefundById(id) {
    const response = await apiClient.get(`/refunds/${id}`);
    return response.data;
  }

  static async getUserRefunds(userId) {
    const response = await apiClient.get(`/refunds/user/${userId}`);
    return response.data;
  }

  static async createRefund(refundData) {
    const response = await apiClient.post('/refunds', refundData);
    return response.data;
  }

  static async updateRefund(id, refundData) {
    const response = await apiClient.put(`/refunds/${id}`, refundData);
    return response.data;
  }
}

export default apiClient;
