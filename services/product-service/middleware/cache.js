/**
 * Caching Middleware for Product Service
 * 
 * Implements Redis-based caching to improve performance for frequently accessed data.
 * This middleware intercepts GET requests and checks if the response is already cached.
 * If cached data exists and is still valid, it returns the cached response.
 * Otherwise, it allows the request to proceed and caches the response.
 * 
 * Caching Strategy:
 * - Product lists: 5 minutes cache (frequent changes due to stock updates)
 * - Individual products: 5 minutes cache (product info changes less frequently)
 * - Product availability: 1 minute cache (stock levels change frequently)
 * - Search results: 3 minutes cache (balance between freshness and performance)
 * 
 * Cache Keys:
 * - Format: product-service:{endpoint}:{hash_of_params}
 * - Examples: product-service:products:list:page1-size10
 *           product-service:product:123
 *           product-service:search:query-laptop
 */

import Redis from 'ioredis';
import crypto from 'crypto';
import { recordError } from './metrics.js';

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

// Redis connection event handlers
redis.on('connect', () => {
  console.log('Product Service: Redis connected');
});

redis.on('error', (error) => {
  console.error('Product Service: Redis connection error:', error);
});

redis.on('reconnecting', () => {
  console.log('Product Service: Redis reconnecting...');
});

/**
 * Generate cache key based on request URL and parameters
 * 
 * @param {Request} req - Express request object
 * @param {string} prefix - Cache key prefix
 * @returns {string} - Generated cache key
 */
const generateCacheKey = (req, prefix = 'product-service') => {
  // Create a string representation of the request
  const requestString = JSON.stringify({
    path: req.path,
    query: req.query,
    method: req.method
  });
  
  // Generate hash for consistent key length
  const hash = crypto.createHash('md5').update(requestString).digest('hex');
  
  return `${prefix}:${req.path.replace(/\//g, ':')}:${hash}`;
};

/**
 * Cache middleware factory
 * 
 * @param {number} ttl - Time to live in seconds
 * @param {string} keyPrefix - Cache key prefix (optional)
 * @returns {Function} - Express middleware function
 */
export const cacheMiddleware = (ttl = 300, keyPrefix = 'product-service') => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = generateCacheKey(req, keyPrefix);
      
      // Try to get cached data
      const cachedData = await redis.get(cacheKey);
      
      if (cachedData) {
        // Parse cached data
        const parsedData = JSON.parse(cachedData);
        
        // Add cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'X-Cache-TTL': ttl,
          'X-Service-Name': 'product-service'
        });
        
        // Return cached response
        return res.json(parsedData);
      }

      // Cache miss - intercept response to cache it
      const originalJson = res.json;
      
      res.json = function(data) {
        // Cache the response data
        redis.setex(cacheKey, ttl, JSON.stringify(data))
          .catch(error => {
            console.error('Failed to cache response:', error);
            recordError('cache_write', req.path);
          });
        
        // Add cache headers
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'X-Cache-TTL': ttl,
          'X-Service-Name': 'product-service'
        });
        
        // Call original json method
        return originalJson.call(this, data);
      };

      // Continue to next middleware
      next();

    } catch (error) {
      // If caching fails, log error but don't break the request
      console.error('Cache middleware error:', error);
      recordError('cache_error', req.path);
      next();
    }
  };
};

/**
 * Cache invalidation utility
 * 
 * Provides methods to invalidate cached data when products are modified
 */
export const cacheInvalidation = {
  /**
   * Invalidate all product-related cache entries
   */
  async invalidateAll() {
    try {
      const keys = await redis.keys('product-service:*');
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`Invalidated ${keys.length} cache entries`);
      }
    } catch (error) {
      console.error('Failed to invalidate all cache entries:', error);
      recordError('cache_invalidation', 'all');
    }
  },

  /**
   * Invalidate product list caches
   */
  async invalidateProductLists() {
    try {
      const keys = await redis.keys('product-service:*products*');
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`Invalidated ${keys.length} product list cache entries`);
      }
    } catch (error) {
      console.error('Failed to invalidate product list cache:', error);
      recordError('cache_invalidation', 'product_lists');
    }
  },

  /**
   * Invalidate specific product cache
   * 
   * @param {number} productId - Product ID to invalidate
   */
  async invalidateProduct(productId) {
    try {
      const keys = await redis.keys(`product-service:*${productId}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`Invalidated ${keys.length} cache entries for product ${productId}`);
      }
    } catch (error) {
      console.error(`Failed to invalidate cache for product ${productId}:`, error);
      recordError('cache_invalidation', `product_${productId}`);
    }
  },

  /**
   * Invalidate search-related caches
   */
  async invalidateSearchResults() {
    try {
      const keys = await redis.keys('product-service:*search*');
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`Invalidated ${keys.length} search cache entries`);
      }
    } catch (error) {
      console.error('Failed to invalidate search cache:', error);
      recordError('cache_invalidation', 'search');
    }
  }
};

// Export Redis client for use in other modules
export { redis };
