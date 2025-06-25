import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, thresholds } from './config.js';

export const options = {
  thresholds,
  scenarios: {
    login_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },   // Ramp up to 5 users
        { duration: '1m', target: 5 },    // Stay at 5 for 1 minute
        { duration: '30s', target: 0 }     // Ramp down to 0
      ],
    },
  },
};

export default function() {
  const payload = JSON.stringify({
    nom: `user${__VU}`,
    password: 'password123'
  });
  
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };
  
  const res = http.post(`${BASE_URL}/api/v1/users/login`, payload, params);
  
  check(res, {
    'login successful': (r) => r.status === 200,
    'has token': (r) => r.json('token') !== undefined,
  });
  
  sleep(1);
} 