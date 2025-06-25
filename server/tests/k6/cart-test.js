import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, thresholds } from './config.js';

export const options = {
  thresholds,
  scenarios: {
    cart_operations: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 5 },
        { duration: '30s', target: 0 },
      ],
    },
  },
};

export default function() {
  // Login first to get token
  const loginRes = http.post(`${BASE_URL}/api/v1/users/login`, JSON.stringify({
    nom: `user${__VU}`,
    password: 'password123'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (loginRes.status !== 200) return;
  
  const token = loginRes.json('token');
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  // Get products
  const productsRes = http.get(`${BASE_URL}/api/v1/products`, { headers: authHeaders });
  if (!Array.isArray(productsRes.json()) || productsRes.json().length === 0) return;
  
  const products = productsRes.json();
  const randomProduct = products[Math.floor(Math.random() * products.length)];
  
  // Add to cart
  const addToCartRes = http.post(`${BASE_URL}/api/v1/sales`, JSON.stringify({
    productId: randomProduct.id,
    quantity: 1
  }), { headers: authHeaders });
  
  check(addToCartRes, {
    'added to cart': (r) => r.status === 201 || r.status === 200,
  });
  
  sleep(1);
} 