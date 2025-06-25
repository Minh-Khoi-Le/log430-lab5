import { getCache, setCache } from '../services/redis.service.js';

/**
 * Middleware to cache API responses
 * @param {number} ttl - Time to live in seconds
 * @returns {Function} - Express middleware function
 */
export const cacheMiddleware = (ttl) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Create cache key from URL and query params
    const cacheKey = `api:${req.originalUrl}`;
    
    try {
      // Check if response is in cache
      const cachedData = await getCache(cacheKey);
      
      if (cachedData) {
        // Return cached response
        return res.json(cachedData);
      }
      
      // Store original res.json method
      const originalJson = res.json;
      
      // Override res.json method to cache response before sending
      res.json = function(data) {
        // Cache response data (will be ignored if Redis is not available)
        setCache(cacheKey, data, ttl).catch(err => {
          // Silently handle cache errors to not affect the response
          console.debug('Cache set error (non-critical):', err.message);
        });
        
        // Call original json method
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.warn('Cache middleware error, continuing without cache:', error.message);
      // Continue processing the request even if cache fails
      next();
    }
  };
};

export default cacheMiddleware; 