// Base URL for all API requests - Updated for API Gateway
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// API Gateway configuration
export const API_CONFIG = {
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": import.meta.env.VITE_API_KEY || "frontend-app-key-12345", // Frontend API key for Kong Gateway
  },
};

// Microservice endpoint mappings for API Gateway
export const API_ENDPOINTS = {
  // User Service endpoints
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout"
  },
  USERS: {
    BASE: "/users",
    PROFILE: "/users/profile",
    BY_ID: (id) => `/users/${id}`
  },
  
  // Product Service endpoints
  PRODUCTS: {
    BASE: "/products",
    BY_ID: (id) => `/products/${id}`,
    SEARCH: "/products/search"
  },
  
  // Store Service endpoints
  STORES: {
    BASE: "/stores",
    BY_ID: (id) => `/stores/${id}`,
    PRODUCTS: (storeId) => `/stores/${storeId}/products`
  },
  
  // Stock Service endpoints
  STOCK: {
    BASE: "/api/stock",
    BY_PRODUCT: (productId) => `/api/stock/product/${productId}`,
    BY_STORE: (storeId) => `/api/stock/store/${storeId}`,
    UPDATE: "/api/stock/update"
  },
  
  // Sales Service endpoints
  SALES: {
    BASE: "/sales",
    BY_ID: (id) => `/sales/${id}`,
    BY_USER: (userId) => `/sales/user/${userId}`,
    CREATE: "/sales",
    BY_CUSTOMER: (customerId) => `/sales/customer/${customerId}`
  },
  
  // Refund Service endpoints
  REFUNDS: {
    BASE: "/refunds",
    BY_ID: (id) => `/refunds/${id}`,
    CREATE: "/refunds"
  },
  
  // Cart Service endpoints
  CART: {
    BASE: "/cart",
    BY_USER: (userId) => `/cart/user/${userId}`,
    ADD: "/cart/add",
    REMOVE: "/cart/remove",
    CLEAR: "/cart/clear"
  }
};

/**
 * Enhanced API fetch function for API Gateway
 * 
 * Makes a request to the API Gateway with proper authentication.
 * Automatically includes API key and handles basic error checking.
 * 
 * @param {string} path - API endpoint path (will be appended to API_BASE)
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @param {string} token - Optional JWT token for authenticated requests
 * @returns {Promise<Object>} - Promise resolving to the JSON response
 * @throws {Error} - If the request fails or returns a non-OK status
 */
export async function apiFetch(path, options = {}, token = null) {
  // Merge default headers with provided options
  const config = {
    ...options,
    headers: {
      ...API_CONFIG.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const fullUrl = `${API_BASE}${path}`;

  try {
    const res = await fetch(fullUrl, config);
    
    if (!res.ok) {
      let errorText;
      try {
        errorText = await res.text();
      } catch {
        errorText = `HTTP ${res.status} ${res.statusText}`;
      }
      throw new Error(`API Error ${res.status}: ${errorText}`);
    }
    
    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const jsonResponse = await res.json();
      // Handle structured error responses
      if (!res.ok && jsonResponse.success === false) {
        throw new Error(`API Error ${res.status}: ${jsonResponse.message || jsonResponse.error || 'Unknown error'}`);
      }
      return jsonResponse;
    } else {
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`API Error ${res.status}: ${text || res.statusText}`);
      }
      throw new Error(`API Error 502: An invalid response was received from the upstream server, request_id: "${text}"`);
    }
  } catch (error) {
    console.error('API Fetch Error:', {
      url: fullUrl,
      error: error.message
    });
    throw error;
  }
}

/**
 * Authenticated API fetch - automatically includes user token
 * 
 * @param {string} path - API endpoint path
 * @param {Object} options - Fetch options
 * @param {string} token - JWT token for authentication
 * @returns {Promise<Object>} - Promise resolving to the JSON response
 */
export async function authenticatedFetch(path, token, options = {}) {
  return apiFetch(path, options, token);
}

/**
 * Legacy fetch function for backward compatibility
 * Redirects to apiFetch with API Gateway configuration
 */
export const fetchAPI = apiFetch;
