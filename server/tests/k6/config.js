export const BASE_URL = 'http://localhost:3000'; // Adjust to target env

export const thresholds = {
  http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
  http_req_failed: ['rate<0.01'],    // Less than 1% errors
}; 