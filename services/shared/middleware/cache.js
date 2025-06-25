/**
 * Shared Cache Middleware
 * 
 * Provides Redis-based caching functionality for all microservices.
 * Includes cache strategies, invalidation, and performance monitoring.
 * 
 * @author Log430 Lab5 Team
 * @version 1.0.0
 */

import { createClient } from 'redis';
import { logger } from '../utils/logger.js';
import { recordCacheOperation } from './metrics.js';
import { CacheError } from './errorHandler.js';

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CACHE_PREFIX = process.env.CACHE_PREFIX || 'log430';
const DEFAULT_TTL = parseInt(process.env.CACHE_DEFAULT_TTL || '3600', 10); // 1 hour
const SERVICE_NAME = process.env.SERVICE_NAME || 'unknown-service';

// Create Redis client
let redisClient = null;
let isConnected = false;

/**
 * Initialize Redis connection
 */
export const initializeCache = async () => {
  try {
    redisClient = createClient({
      url: REDIS_URL,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.error('Redis connection refused');
          return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          logger.error('Redis retry time exhausted');
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          logger.error('Redis max retry attempts reached');
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
      isConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
      isConnected = true;
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
      isConnected = true;
    });

    redisClient.on('end', () => {
      logger.warn('Redis client connection ended');
      isConnected = false;
    });

    await redisClient.connect();
    logger.info('Cache initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize cache', { error: error.message });
    throw new CacheError('Failed to initialize cache connection');
  }
};

/**
 * Generate cache key with service prefix
 */
export const generateCacheKey = (key, ...parts) => {
  const keyParts = [CACHE_PREFIX, SERVICE_NAME, key, ...parts].filter(Boolean);
  return keyParts.join(':');
};

/**
 * Check if cache is available
 */
export const isCacheAvailable = () => {
  return isConnected && redisClient;
};

/**
 * Get value from cache
 */
export const getFromCache = async (key) => {
  if (!isCacheAvailable()) {
    logger.debug('Cache not available for get operation', { key });
    recordCacheOperation('get', false);
    return null;
  }

  try {
    const startTime = Date.now();
    const cacheKey = generateCacheKey(key);
    const value = await redisClient.get(cacheKey);
    const duration = Date.now() - startTime;

    if (value !== null) {
      recordCacheOperation('get', true);
      logger.debug('Cache hit', { key: cacheKey, duration });
      return JSON.parse(value);
    } else {
      recordCacheOperation('get', false);
      logger.debug('Cache miss', { key: cacheKey, duration });
      return null;
    }
  } catch (error) {
    logger.error('Cache get error', { key, error: error.message });
    recordCacheOperation('get', false);
    return null;
  }
};

/**
 * Set value in cache
 */
export const setInCache = async (key, value, ttl = DEFAULT_TTL) => {
  if (!isCacheAvailable()) {
    logger.debug('Cache not available for set operation', { key });
    return false;
  }

  try {
    const startTime = Date.now();
    const cacheKey = generateCacheKey(key);
    const serializedValue = JSON.stringify(value);
    
    await redisClient.setEx(cacheKey, ttl, serializedValue);
    
    const duration = Date.now() - startTime;
    recordCacheOperation('set', true);
    logger.debug('Cache set successful', { key: cacheKey, ttl, duration });
    return true;
  } catch (error) {
    logger.error('Cache set error', { key, ttl, error: error.message });
    recordCacheOperation('set', false);
    return false;
  }
};

/**
 * Delete value from cache
 */
export const deleteFromCache = async (key) => {
  if (!isCacheAvailable()) {
    logger.debug('Cache not available for delete operation', { key });
    return false;
  }

  try {
    const startTime = Date.now();
    const cacheKey = generateCacheKey(key);
    const result = await redisClient.del(cacheKey);
    const duration = Date.now() - startTime;
    
    recordCacheOperation('delete', result > 0);
    logger.debug('Cache delete', { key: cacheKey, deleted: result > 0, duration });
    return result > 0;
  } catch (error) {
    logger.error('Cache delete error', { key, error: error.message });
    recordCacheOperation('delete', false);
    return false;
  }
};

/**
 * Delete multiple keys from cache
 */
export const deleteMultipleFromCache = async (keys) => {
  if (!isCacheAvailable() || !keys.length) {
    return 0;
  }

  try {
    const startTime = Date.now();
    const cacheKeys = keys.map(key => generateCacheKey(key));
    const result = await redisClient.del(cacheKeys);
    const duration = Date.now() - startTime;
    
    recordCacheOperation('delete_multiple', result > 0);
    logger.debug('Cache delete multiple', { keys: cacheKeys, deleted: result, duration });
    return result;
  } catch (error) {
    logger.error('Cache delete multiple error', { keys, error: error.message });
    recordCacheOperation('delete_multiple', false);
    return 0;
  }
};

/**
 * Clear all cache keys with service prefix
 */
export const clearServiceCache = async () => {
  if (!isCacheAvailable()) {
    return 0;
  }

  try {
    const startTime = Date.now();
    const pattern = generateCacheKey('*');
    const keys = await redisClient.keys(pattern);
    
    if (keys.length === 0) {
      return 0;
    }
    
    const result = await redisClient.del(keys);
    const duration = Date.now() - startTime;
    
    recordCacheOperation('clear', result > 0);
    logger.info('Service cache cleared', { keysDeleted: result, duration });
    return result;
  } catch (error) {
    logger.error('Cache clear error', { error: error.message });
    recordCacheOperation('clear', false);
    return 0;
  }
};

/**
 * Check if key exists in cache
 */
export const existsInCache = async (key) => {
  if (!isCacheAvailable()) {
    return false;
  }

  try {
    const cacheKey = generateCacheKey(key);
    const exists = await redisClient.exists(cacheKey);
    return exists === 1;
  } catch (error) {
    logger.error('Cache exists error', { key, error: error.message });
    return false;
  }
};

/**
 * Set cache expiration
 */
export const setCacheExpiration = async (key, ttl) => {
  if (!isCacheAvailable()) {
    return false;
  }

  try {
    const cacheKey = generateCacheKey(key);
    const result = await redisClient.expire(cacheKey, ttl);
    return result === 1;
  } catch (error) {
    logger.error('Cache expire error', { key, ttl, error: error.message });
    return false;
  }
};

/**
 * Get cache TTL
 */
export const getCacheTTL = async (key) => {
  if (!isCacheAvailable()) {
    return -1;
  }

  try {
    const cacheKey = generateCacheKey(key);
    return await redisClient.ttl(cacheKey);
  } catch (error) {
    logger.error('Cache TTL error', { key, error: error.message });
    return -1;
  }
};

/**
 * Cache middleware for Express routes
 */
export const cacheMiddleware = (ttl = DEFAULT_TTL, keyGenerator = null) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      let cacheKey;
      if (keyGenerator && typeof keyGenerator === 'function') {
        cacheKey = keyGenerator(req);
      } else {
        // Default key generation: method:path:query
        const queryString = Object.keys(req.query).length > 0 
          ? ':' + JSON.stringify(req.query) 
          : '';
        cacheKey = `${req.method}:${req.path}${queryString}`;
      }

      // Try to get from cache
      const cachedResponse = await getFromCache(cacheKey);
      
      if (cachedResponse) {
        logger.debug('Serving cached response', { key: cacheKey });
        res.set('X-Cache', 'HIT');
        return res.json(cachedResponse);
      }

      // Cache miss - intercept response
      res.set('X-Cache', 'MISS');
      const originalJson = res.json;
      
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setInCache(cacheKey, data, ttl)
            .then(() => {
              logger.debug('Response cached', { key: cacheKey, ttl });
            })
            .catch(error => {
              logger.error('Failed to cache response', { 
                key: cacheKey, 
                error: error.message 
              });
            });
        }
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error: error.message });
      next();
    }
  };
};

/**
 * Cache invalidation patterns
 */
export const invalidatePattern = async (pattern) => {
  if (!isCacheAvailable()) {
    return 0;
  }

  try {
    const startTime = Date.now();
    const searchPattern = generateCacheKey(pattern);
    const keys = await redisClient.keys(searchPattern);
    
    if (keys.length === 0) {
      return 0;
    }
    
    const result = await redisClient.del(keys);
    const duration = Date.now() - startTime;
    
    recordCacheOperation('invalidate_pattern', result > 0);
    logger.info('Cache pattern invalidated', { 
      pattern: searchPattern, 
      keysDeleted: result, 
      duration 
    });
    return result;
  } catch (error) {
    logger.error('Cache pattern invalidation error', { pattern, error: error.message });
    recordCacheOperation('invalidate_pattern', false);
    return 0;
  }
};

/**
 * Warm up cache with data
 */
export const warmUpCache = async (data) => {
  if (!isCacheAvailable()) {
    return false;
  }

  try {
    const promises = Object.entries(data).map(([key, value]) => {
      const { data: cacheData, ttl = DEFAULT_TTL } = value;
      return setInCache(key, cacheData, ttl);
    });

    const results = await Promise.allSettled(promises);
    const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
    
    logger.info('Cache warm-up completed', { 
      total: results.length, 
      successful 
    });
    
    return successful === results.length;
  } catch (error) {
    logger.error('Cache warm-up error', { error: error.message });
    return false;
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async () => {
  if (!isCacheAvailable()) {
    return null;
  }

  try {
    const info = await redisClient.info('memory');
    const keyspace = await redisClient.info('keyspace');
    
    return {
      connected: isConnected,
      memory: info,
      keyspace: keyspace,
      service: SERVICE_NAME
    };
  } catch (error) {
    logger.error('Failed to get cache stats', { error: error.message });
    return null;
  }
};

/**
 * Gracefully close cache connection
 */
export const closeCache = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Cache connection closed gracefully');
    } catch (error) {
      logger.error('Error closing cache connection', { error: error.message });
    }
  }
};

// Export Redis client for advanced usage
export { redisClient };
