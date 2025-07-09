import http from 'k6/http';
import { check, group } from 'k6';
import { CONFIG, ENDPOINTS } from '../config/config.js';
import { thinkTime, logTestResult, addAuthHeader, getRandomItem } from '../utils/helpers.js';
import { loginTestUser, loginClient, loginManager } from '../utils/auth.js';

/**
 * Multi-User Concurrent Scenario Test
 * 
 * This test simulates multiple users connected to the store simultaneously,
 * performing various actions concurrently to create realistic load patterns.
 * 
 * Features:
 * - Multiple concurrent user sessions
 * - Different user roles (customers, managers, admins)
 * - Realistic user behavior patterns
 * - Sustained concurrent connections
 * - Mixed workload scenarios
 */

export const options = {
  stages: [
    // Gradual ramp-up to simulate users joining throughout the day
    { duration: '2m', target: 10 },   // Morning opening - initial users
    { duration: '3m', target: 25 },   // Mid-morning traffic increase
    { duration: '5m', target: 40 },   // Peak morning traffic
    { duration: '2m', target: 35 },   // Slight decrease
    { duration: '10m', target: 50 },  // Lunch rush - peak concurrent users
    { duration: '5m', target: 45 },   // Post-lunch sustained traffic
    { duration: '8m', target: 60 },   // Afternoon peak
    { duration: '3m', target: 30 },   // Evening wind-down
    { duration: '2m', target: 15 },   // Closing time
    { duration: '2m', target: 0 }     // System shutdown
  ],
  thresholds: {
    // More lenient thresholds for multi-user scenarios
    http_req_duration: ['p(95)<3000'], // 95% of requests should be below 3s
    http_req_failed: ['rate<0.12'],    // Error rate should be below 12%
    http_reqs: ['rate>2'],             // Request rate should be above 2 RPS
    checks: ['rate>0.85'],             // Check success rate should be above 85%
    
    // Custom thresholds for different user types
    'http_req_duration{user_type:customer}': ['p(95)<2000'],
    'http_req_duration{user_type:manager}': ['p(95)<2500'],
    'http_req_duration{user_type:admin}': ['p(95)<3000'],
    
    // VU (Virtual User) monitoring - this is a valid k6 metric
    'vus': ['value>10'],              // Maintain at least 10 active virtual users
    'vus_max': ['value>10']           // Maximum concurrent virtual users
  },
  tags: {
    service: 'multi-user-scenario',
    endpoint: 'concurrent-users'
  }
};

export default function() {
  // Determine user type based on VU number for realistic distribution
  const userType = determineUserType(__VU);
  
  // Set user-specific tags
  const userTags = { user_type: userType };
  
  // Execute user-specific behavior pattern
  switch (userType) {
    case 'customer':
      customerBehaviorPattern(userTags);
      break;
    case 'manager':
      managerBehaviorPattern(userTags);
      break;
    case 'admin':
      adminBehaviorPattern(userTags);
      break;
    default:
      generalUserBehaviorPattern(userTags);
  }
}

/**
 * Determine user type based on VU number for realistic distribution
 * 70% customers, 25% managers, 5% admins
 */
function determineUserType(vuNumber) {
  const userTypeRatio = vuNumber % 100;
  
  if (userTypeRatio < 70) {
    return 'customer';
  } else if (userTypeRatio < 95) {
    return 'manager';
  } else {
    return 'admin';
  }
}

/**
 * Customer behavior pattern - browsing, searching, purchasing
 */
function customerBehaviorPattern(tags) {
  // Authenticate as customer
  const auth = loginClient();
  if (!auth) {
    console.error('Customer authentication failed');
    return;
  }
  
  // Customer session activities
  group('Customer Session', () => {
    // Browse products (most common activity)
    browseProducts(auth.token, tags);
    thinkTime(2, 5); // Customers spend time browsing
    
    // Search for specific items
    searchProducts(auth.token, tags);
    thinkTime(1, 3);
    
    // Check product availability at different stores
    checkProductAvailability(auth.token, tags);
    thinkTime(1, 2);
    
    // View purchase history (returning customers)
    if (Math.random() < 0.6) { // 60% chance
      viewPurchaseHistory(auth.token, tags);
      thinkTime(1, 2);
    }
    
    // Simulate shopping cart behavior
    if (Math.random() < 0.4) { // 40% chance of making a purchase
      simulateShoppingCart(auth.token, tags);
      thinkTime(2, 4);
    }
  });
}

/**
 * Manager behavior pattern - inventory management, sales monitoring
 */
function managerBehaviorPattern(tags) {
  // Authenticate as manager
  const auth = loginManager();
  if (!auth) {
    console.error('Manager authentication failed');
    return;
  }
  
  // Manager session activities
  group('Manager Session', () => {
    // Check store dashboard
    checkStoreDashboard(auth.token, tags);
    thinkTime(2, 4);
    
    // Monitor stock levels
    monitorStockLevels(auth.token, tags);
    thinkTime(1, 3);
    
    // Review sales reports
    reviewSalesReports(auth.token, tags);
    thinkTime(2, 3);
    
    // Manage refunds (occasional activity)
    if (Math.random() < 0.3) { // 30% chance
      manageRefunds(auth.token, tags);
      thinkTime(1, 2);
    }
    
    // Update inventory (frequent activity)
    if (Math.random() < 0.7) { // 70% chance
      updateInventory(auth.token, tags);
      thinkTime(1, 2);
    }
  });
}

/**
 * Admin behavior pattern - system monitoring, user management
 */
function adminBehaviorPattern(tags) {
  // Authenticate as admin
  const auth = loginTestUser(0); // Use admin user
  if (!auth) {
    console.error('Admin authentication failed');
    return;
  }
  
  // Admin session activities
  group('Admin Session', () => {
    // System health checks
    performSystemHealthChecks(auth.token, tags);
    thinkTime(3, 5);
    
    // User management
    manageUsers(auth.token, tags);
    thinkTime(2, 4);
    
    // System analytics
    reviewSystemAnalytics(auth.token, tags);
    thinkTime(3, 5);
    
    // Store management
    manageStores(auth.token, tags);
    thinkTime(2, 3);
  });
}

/**
 * General user behavior pattern - fallback for unspecified users
 */
function generalUserBehaviorPattern(tags) {
  const auth = loginTestUser(__VU % 5);
  if (!auth) {
    console.error('General user authentication failed');
    return;
  }
  
  // General activities
  group('General User Session', () => {
    browseProducts(auth.token, tags);
    thinkTime(1, 3);
    
    searchProducts(auth.token, tags);
    thinkTime(1, 2);
  });
}

/**
 * Customer Activities
 */
function browseProducts(token, tags) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.BASE}`,
    { headers: { ...addAuthHeader(token).headers }, tags }
  );
  
  check(response, {
    'Browse Products - Status OK': (r) => r.status === 200,
    'Browse Products - Response time acceptable': (r) => r.timings.duration < 2000
  });
  
  logTestResult('Browse Products', response, 200);
}

function searchProducts(token, tags) {
  const searchTerms = ['laptop', 'phone', 'headphones', 'shoes', 'coffee'];
  const term = getRandomItem(searchTerms);
  
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.SEARCH}?name=${term}`,
    { headers: { ...addAuthHeader(token).headers }, tags }
  );
  
  check(response, {
    'Search Products - Status OK': (r) => r.status === 200,
    'Search Products - Response time acceptable': (r) => r.timings.duration < 1500
  });
  
  logTestResult('Search Products', response, 200);
}

function checkProductAvailability(token, tags) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.BASE}`,
    { headers: { ...addAuthHeader(token).headers }, tags }
  );
  
  check(response, {
    'Check Stock - Status OK': (r) => r.status === 200,
    'Check Stock - Response time acceptable': (r) => r.timings.duration < 1000
  });
  
  logTestResult('Check Stock', response, 200);
}

function viewPurchaseHistory(token, tags) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.BASE}`,
    { headers: { ...addAuthHeader(token).headers }, tags }
  );
  
  check(response, {
    'View Purchase History - Status OK': (r) => r.status === 200,
    'View Purchase History - Response time acceptable': (r) => r.timings.duration < 1500
  });
  
  logTestResult('View Purchase History', response, 200);
}

function simulateShoppingCart(token, tags) {
  // Simulate adding items to cart and potentially checking out
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.BASE}`,
    { headers: { ...addAuthHeader(token).headers }, tags }
  );
  
  check(response, {
    'Shopping Cart - Status OK': (r) => r.status === 200,
    'Shopping Cart - Response time acceptable': (r) => r.timings.duration < 2000
  });
  
  logTestResult('Shopping Cart Simulation', response, 200);
}

/**
 * Manager Activities
 */
function checkStoreDashboard(token, tags) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STORES.BASE}`,
    { headers: { ...addAuthHeader(token).headers }, tags }
  );
  
  check(response, {
    'Store Dashboard - Status OK': (r) => r.status === 200,
    'Store Dashboard - Response time acceptable': (r) => r.timings.duration < 2000
  });
  
  logTestResult('Store Dashboard', response, 200);
}

function monitorStockLevels(token, tags) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.LOW_STOCK}`,
    { headers: { ...addAuthHeader(token).headers }, tags }
  );
  
  check(response, {
    'Monitor Stock - Status OK': (r) => r.status === 200,
    'Monitor Stock - Response time acceptable': (r) => r.timings.duration < 1500
  });
  
  logTestResult('Monitor Stock Levels', response, 200);
}

function reviewSalesReports(token, tags) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.SUMMARY}`,
    { headers: { ...addAuthHeader(token).headers }, tags }
  );
  
  check(response, {
    'Sales Reports - Status OK': (r) => r.status === 200,
    'Sales Reports - Response time acceptable': (r) => r.timings.duration < 2500
  });
  
  logTestResult('Sales Reports', response, 200);
}

function manageRefunds(token, tags) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.REFUNDS.BASE}`,
    { headers: { ...addAuthHeader(token).headers }, tags }
  );
  
  check(response, {
    'Manage Refunds - Status OK': (r) => r.status === 200,
    'Manage Refunds - Response time acceptable': (r) => r.timings.duration < 1500
  });
  
  logTestResult('Manage Refunds', response, 200);
}

function updateInventory(token, tags) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.BASE}`,
    { headers: { ...addAuthHeader(token).headers }, tags }
  );
  
  check(response, {
    'Update Inventory - Status OK': (r) => r.status === 200,
    'Update Inventory - Response time acceptable': (r) => r.timings.duration < 1000
  });
  
  logTestResult('Update Inventory', response, 200);
}

/**
 * Admin Activities
 */
function performSystemHealthChecks(token, tags) {
  const healthEndpoints = [
    ENDPOINTS.HEALTH.USER_SERVICE,
    ENDPOINTS.HEALTH.CATALOG_SERVICE,
    ENDPOINTS.HEALTH.TRANSACTION_SERVICE
  ];
  
  healthEndpoints.forEach(endpoint => {
    const response = http.get(
      `${CONFIG.BASE_URL}${endpoint}`,
      { headers: { ...addAuthHeader(token).headers }, tags }
    );
    
    check(response, {
      'Health Check - Status OK': (r) => r.status === 200,
      'Health Check - Response time fast': (r) => r.timings.duration < 500
    });
    
    logTestResult(`Health Check ${endpoint}`, response, 200);
  });
}

function manageUsers(token, tags) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.USERS.BASE}`,
    { headers: { ...addAuthHeader(token).headers }, tags }
  );
  
  check(response, {
    'Manage Users - Status OK': (r) => r.status === 200,
    'Manage Users - Response time acceptable': (r) => r.timings.duration < 2000
  });
  
  logTestResult('Manage Users', response, 200);
}

function reviewSystemAnalytics(token, tags) {
  const analyticsEndpoints = [
    ENDPOINTS.SALES.SUMMARY,
    ENDPOINTS.REFUNDS.SUMMARY,
    ENDPOINTS.STOCK.LOW_STOCK
  ];
  
  analyticsEndpoints.forEach(endpoint => {
    const response = http.get(
      `${CONFIG.BASE_URL}${endpoint}`,
      { headers: { ...addAuthHeader(token).headers }, tags }
    );
    
    check(response, {
      'System Analytics - Status OK': (r) => r.status === 200,
      'System Analytics - Response time acceptable': (r) => r.timings.duration < 3000
    });
    
    logTestResult(`System Analytics ${endpoint}`, response, 200);
  });
}

function manageStores(token, tags) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STORES.BASE}`,
    { headers: { ...addAuthHeader(token).headers }, tags }
  );
  
  check(response, {
    'Manage Stores - Status OK': (r) => r.status === 200,
    'Manage Stores - Response time acceptable': (r) => r.timings.duration < 1500
  });
  
  logTestResult('Manage Stores', response, 200);
}
