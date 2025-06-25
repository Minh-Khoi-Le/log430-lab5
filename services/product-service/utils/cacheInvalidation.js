/**
 * Cache Invalidation Utilities for Product Service
 * 
 * This module provides utilities for invalidating cached data when products are modified.
 * It implements intelligent cache invalidation strategies to maintain data consistency
 * while maximizing cache hit rates.
 * 
 * Invalidation Strategies:
 * - Immediate invalidation: When products are created, updated, or deleted
 * - Pattern-based invalidation: Invalidate related cache entries
 * - Selective invalidation: Target specific cache keys to minimize performance impact
 * 
 * Cache Key Patterns:
 * - Product lists: product-service:*products*
 * - Individual products: product-service:*product*{id}*
 * - Search results: product-service:*search*
 * - Availability data: product-service:*availability*
 */

import { redis } from '../middleware/cache.js';
import { recordError } from '../middleware/metrics.js';

/**
 * Cache invalidation utilities
 */
export const invalidateCache = async (patterns) => {
  if (!Array.isArray(patterns)) {
    patterns = [patterns];
  }

  try {
    const allKeys = [];
    
    // Collect all keys matching the patterns
    for (const pattern of patterns) {
      let searchPattern;
      
      // Convert pattern to Redis key pattern
      switch (pattern) {
        case 'products':
        case 'product-catalog':
          searchPattern = 'product-service:*products*';
          break;
        case 'search':
          searchPattern = 'product-service:*search*';
          break;
        case 'availability':
          searchPattern = 'product-service:*availability*';
          break;
        default:
          // Handle specific product patterns like 'product-123'
          if (pattern.startsWith('product-')) {
            const productId = pattern.replace('product-', '');
            searchPattern = `product-service:*${productId}*`;
          } else {
            searchPattern = `product-service:*${pattern}*`;
          }
      }
      
      const keys = await redis.keys(searchPattern);
      allKeys.push(...keys);
    }

    // Remove duplicates
    const uniqueKeys = [...new Set(allKeys)];
    
    // Delete all matching keys
    if (uniqueKeys.length > 0) {
      await redis.del(...uniqueKeys);
      console.log(`Cache invalidation: Removed ${uniqueKeys.length} cache entries`);
    }
    
    return uniqueKeys.length;

  } catch (error) {
    console.error('Cache invalidation failed:', error);
    recordError('cache_invalidation', 'general');
    return 0;
  }
};

/**
 * Invalidate all product-related cache entries
 */
export const invalidateAllProductCache = async () => {
  try {
    const keys = await redis.keys('product-service:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Cache invalidation: Removed all ${keys.length} product service cache entries`);
      return keys.length;
    }
    return 0;
  } catch (error) {
    console.error('Failed to invalidate all product cache:', error);
    recordError('cache_invalidation', 'all_products');
    return 0;
  }
};

/**
 * Invalidate cache for a specific product
 */
export const invalidateProductCache = async (productId) => {
  try {
    const patterns = [
      `product-service:*product*${productId}*`,
      `product-service:*availability*${productId}*`,
      'product-service:*products*', // Also invalidate product lists
      'product-service:*search*'    // And search results
    ];

    const allKeys = [];
    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      allKeys.push(...keys);
    }

    const uniqueKeys = [...new Set(allKeys)];
    
    if (uniqueKeys.length > 0) {
      await redis.del(...uniqueKeys);
      console.log(`Cache invalidation: Removed ${uniqueKeys.length} cache entries for product ${productId}`);
    }
    
    return uniqueKeys.length;
  } catch (error) {
    console.error(`Failed to invalidate cache for product ${productId}:`, error);
    recordError('cache_invalidation', `product_${productId}`);
    return 0;
  }
};

/**
 * Scheduled cache cleanup - removes expired entries and performs maintenance
 */
export const scheduleCacheCleanup = () => {
  // Run cleanup every hour
  setInterval(async () => {
    try {
      // Get all product service cache keys
      const keys = await redis.keys('product-service:*');
      let expiredCount = 0;
      
      // Check TTL for each key and remove expired ones
      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl === -1) { // Key without expiration
          // Set a default expiration of 1 hour for keys without TTL
          await redis.expire(key, 3600);
        } else if (ttl === -2) { // Key doesn't exist (expired)
          expiredCount++;
        }
      }
      
      if (expiredCount > 0) {
        console.log(`Cache cleanup: Found ${expiredCount} expired entries`);
      }
      
    } catch (error) {
      console.error('Cache cleanup failed:', error);
      recordError('cache_cleanup', 'scheduled');
    }
  }, 60 * 60 * 1000); // Every hour
};

export default invalidateCache;
