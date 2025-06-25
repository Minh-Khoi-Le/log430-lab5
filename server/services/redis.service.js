import Redis from 'ioredis';
import { Counter } from 'prom-client';

// Check if Redis is disabled via environment variable or if we're in test mode
const REDIS_DISABLED = process.env.REDIS_DISABLED === 'true' || process.env.NODE_ENV === 'test';

// Create Redis client with error handling
let redisClient = null;
let redisConnected = false;

if (!REDIS_DISABLED) {
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || '',
      retryStrategy: (times) => {
        // In test mode, don't retry to avoid hanging connections
        if (process.env.NODE_ENV === 'test') {
          return null;
        }
        return Math.min(times * 50, 2000);
      },
      lazyConnect: true, // Don't connect immediately
      maxRetriesPerRequest: 1, // Reduced for tests
      connectTimeout: 1000, // Short timeout for tests
      commandTimeout: 1000
    });

    // Handle Redis connection events
    redisClient.on('connect', () => {
      console.log('Redis client connected');
      redisConnected = true;
    });
    
    redisClient.on('error', (err) => {
      console.warn('Redis client error:', err.message);
      redisConnected = false;
    });
    
    redisClient.on('close', () => {
      console.log('Redis client disconnected');
      redisConnected = false;
    });

    // Attempt to connect
    redisClient.connect().catch(err => {
      console.warn('Redis connection failed, running without cache:', err.message);
      redisConnected = false;
    });
  } catch (error) {
    console.warn('Redis initialization failed, running without cache:', error.message);
    redisConnected = false;
  }
} else {
  console.log('Redis disabled for test environment');
}

// Cache TTL in seconds
const DEFAULT_TTL = 60 * 5; // 5 minutes

// Cache metrics
export const cacheMetrics = {
  hits: new Counter({
    name: 'redis_cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['endpoint']
  }),
  misses: new Counter({
    name: 'redis_cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['endpoint']
  }),
  errors: new Counter({
    name: 'redis_cache_errors_total',
    help: 'Total number of cache errors',
    labelNames: ['operation']
  })
};

/**
 * Get cached data by key
 * @param {string} key - Cache key
 * @returns {Promise<any>} - Cached data or null if not found
 */
export const getCache = async (key) => {
  if (!redisClient || !redisConnected) {
    return null;
  }
  
  try {
    const data = await redisClient.get(key);
    
    // Extract endpoint from the cache key for metrics
    const endpoint = key.split(':')[1]?.split('?')[0] || 'unknown';
    
    if (data) {
      cacheMetrics.hits.inc({ endpoint });
      return JSON.parse(data);
    } else {
      cacheMetrics.misses.inc({ endpoint });
      return null;
    }
  } catch (error) {
    console.error('Redis get error:', error);
    cacheMetrics.errors.inc({ operation: 'get' });
    return null;
  }
};

/**
 * Set data in cache with TTL
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} [ttl=DEFAULT_TTL] - Time to live in seconds
 */
export const setCache = async (key, data, ttl = DEFAULT_TTL) => {
  if (!redisClient || !redisConnected) {
    return;
  }
  
  try {
    await redisClient.set(key, JSON.stringify(data), 'EX', ttl);
  } catch (error) {
    console.error('Redis set error:', error);
    cacheMetrics.errors.inc({ operation: 'set' });
  }
};

/**
 * Delete cache by key
 * @param {string} key - Cache key
 */
export const deleteCache = async (key) => {
  if (!redisClient || !redisConnected) {
    return;
  }
  
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('Redis del error:', error);
    cacheMetrics.errors.inc({ operation: 'delete' });
  }
};

/**
 * Delete multiple cache entries by pattern
 * @param {string} pattern - Key pattern to delete
 */
export const deleteCachePattern = async (pattern) => {
  if (!redisClient || !redisConnected) {
    return;
  }
  
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (error) {
    console.error('Redis delete pattern error:', error);
    cacheMetrics.errors.inc({ operation: 'deletePattern' });
  }
};

/**
 * Cleanup Redis connection - use this in test teardown
 */
export const cleanup = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      redisConnected = false;
    } catch (error) {
      console.warn('Redis cleanup error:', error.message);
    }
  }
};

// Export Redis availability flag
export const isRedisEnabled = !REDIS_DISABLED && redisConnected;

// Export Redis disabled flag for tests
export const isRedisDisabled = REDIS_DISABLED;

export default redisClient;