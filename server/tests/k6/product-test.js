import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, thresholds } from './config.js';

export const options = {
  thresholds,
  scenarios: {
    product_browsing: {
      executor: 'constant-arrival-rate',
      rate: 5,                // 5 iterations per timeUnit
      timeUnit: '1s',          // 1 second
      duration: '1m',          // Run for 1 minute
      preAllocatedVUs: 5,     // How many VUs to pre-allocate
      maxVUs: 10,             // Maximum number of VUs to use
    },
  },
};

export default function() {
  const res = http.get(`${BASE_URL}/api/v1/products`);
  
  check(res, {
    'products returned': (r) => r.status === 200,
    'has products': (r) => Array.isArray(r.json()),
  });
  
  if (res.status === 200 && Array.isArray(res.json())) {
    const products = res.json();
    if (products.length > 0) {
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      const productRes = http.get(`${BASE_URL}/api/v1/products/${randomProduct.id}`);
      
      check(productRes, {
        'product detail returned': (r) => r.status === 200,
      });
    }
  }
  
  sleep(Math.random() * 3);
} 