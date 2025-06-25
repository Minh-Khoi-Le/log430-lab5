// Base URL for all API requests
export const API_BASE = "http://localhost:3000/api/v1";

/**
 * Fetch data from the API
 * 
 * Makes a request to the API and handles basic error checking.
 * Automatically parses JSON responses.
 * 
 * @param {string} path - API endpoint path (will be appended to API_BASE)
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Object>} - Promise resolving to the JSON response
 * @throws {Error} - If the request fails or returns a non-OK status
 */
export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
} 