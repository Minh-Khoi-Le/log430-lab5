import http from 'k6/http';
import { check, sleep } from 'k6';

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: 10 }, // Ramp up to 10 users over 10 seconds
    { duration: '30s', target: 30 }, // Ramp up to 30 users over 30 seconds
    { duration: '20s', target: 30 }, // Stay at 30 users for 20 seconds
    { duration: '10s', target: 0 },  // Ramp down to 0 users over 10 seconds
  ],
};

// Track pod responses
const podHits = {};

export default function() {
  // Make requests to the API
  const res = http.get('http://localhost:8080/api/v1/products');
  
  // Check if response is valid
  check(res, {
    'is status 200': (r) => r.status === 200,
    'has X-Serving-Pod header': (r) => r.headers['X-Serving-Pod'] !== undefined
  });
  
  // Track which pod served the request
  const pod = res.headers['X-Serving-Pod'];
  if (pod) {
    if (!podHits[pod]) {
      podHits[pod] = 0;
    }
    podHits[pod]++;
    console.log(`Request served by pod: ${pod} (total hits: ${podHits[pod]})`);
  }
  
  // Also make a request to the root endpoint
  const rootRes = http.get('http://localhost:8080/');
  check(rootRes, {
    'root is status 200': (r) => r.status === 200
  });
  
  sleep(Math.random() * 2); // Random sleep between 0-2 seconds
}

// After the test finishes, print summary
export function handleSummary(data) {
  console.log("\n=== Load Balancing Summary ===");
  console.log("Pod hit distribution:");
  
  const totalHits = Object.values(podHits).reduce((a, b) => a + b, 0);
  
  Object.keys(podHits).forEach(pod => {
    const percentage = (podHits[pod] / totalHits * 100).toFixed(2);
    console.log(`${pod}: ${podHits[pod]} hits (${percentage}%)`);
  });
  
  return {
    stdout: JSON.stringify(data),
  };
} 