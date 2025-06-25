/**
 * Shared Cache Invalidation Utility
 * 
 * Provides cache invalidation strategies and patterns for all microservices.
 * Handles cache invalidation based on data relationships and business logic.
 * 
 * @author Log430 Lab5 Team
 * @version 1.0.0
 */

import redisService from './redis.js';
import { logger } from './logger.js';

/**
 * Cache Invalidation Service
 */
class CacheInvalidationService {
  constructor() {
    this.invalidationPatterns = new Map();
    this.dependencies = new Map();
    this.setupDefaultPatterns();
  }

  /**
   * Setup default cache invalidation patterns
   */
  setupDefaultPatterns() {
    // User-related invalidations
    this.addPattern('user:*', ['users:*', 'auth:*']);
    this.addPattern('user:profile:*', ['users:*']);
    this.addPattern('user:role:*', ['users:*', 'auth:*']);

    // Store-related invalidations
    this.addPattern('store:*', ['stores:*', 'store-stats:*']);
    this.addPattern('store:products:*', ['stores:*', 'products:*']);
    this.addPattern('store:users:*', ['stores:*', 'users:*']);

    // Product-related invalidations
    this.addPattern('product:*', ['products:*', 'store:products:*']);
    this.addPattern('product:category:*', ['products:*', 'categories:*']);
    this.addPattern('product:stock:*', ['products:*', 'stock:*']);

    // Stock-related invalidations
    this.addPattern('stock:*', ['stock:*', 'products:*']);
    this.addPattern('stock:movement:*', ['stock:*', 'movements:*']);

    // Sales-related invalidations
    this.addPattern('sale:*', ['sales:*', 'stock:*', 'products:*']);
    this.addPattern('sale:daily:*', ['sales:*', 'reports:*']);
    this.addPattern('sale:monthly:*', ['sales:*', 'reports:*']);

    // Refund-related invalidations
    this.addPattern('refund:*', ['refunds:*', 'sales:*', 'stock:*']);

    // Cart-related invalidations
    this.addPattern('cart:*', ['carts:*']);
    this.addPattern('cart:items:*', ['carts:*', 'products:*']);
  }

  /**
   * Add invalidation pattern
   */
  addPattern(pattern, dependentPatterns) {
    this.invalidationPatterns.set(pattern, dependentPatterns);
    logger.debug('Cache invalidation pattern added', { pattern, dependentPatterns });
  }

  /**
   * Remove invalidation pattern
   */
  removePattern(pattern) {
    this.invalidationPatterns.delete(pattern);
    logger.debug('Cache invalidation pattern removed', { pattern });
  }

  /**
   * Add dependency relationship
   */
  addDependency(key, dependentKeys) {
    if (!Array.isArray(dependentKeys)) {
      dependentKeys = [dependentKeys];
    }
    this.dependencies.set(key, dependentKeys);
    logger.debug('Cache dependency added', { key, dependentKeys });
  }

  /**
   * Remove dependency relationship
   */
  removeDependency(key) {
    this.dependencies.delete(key);
    logger.debug('Cache dependency removed', { key });
  }

  /**
   * Invalidate cache by key
   */
  async invalidateKey(key) {
    try {
      const deleted = await redisService.del(key);
      if (deleted) {
        logger.debug('Cache key invalidated', { key });
      }
      return deleted;
    } catch (error) {
      logger.error('Error invalidating cache key', { key, error: error.message });
      return false;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern) {
    try {
      const keys = await redisService.keys(pattern);
      if (keys.length === 0) {
        logger.debug('No keys found for pattern', { pattern });
        return 0;
      }

      const deleted = await Promise.all(keys.map(key => redisService.del(key)));
      const deletedCount = deleted.filter(Boolean).length;
      
      logger.info('Cache pattern invalidated', { 
        pattern, 
        keysFound: keys.length, 
        keysDeleted: deletedCount 
      });
      
      return deletedCount;
    } catch (error) {
      logger.error('Error invalidating cache pattern', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * Invalidate cache with dependencies
   */
  async invalidateWithDependencies(key) {
    try {
      let totalDeleted = 0;

      // Invalidate the main key
      const mainDeleted = await this.invalidateKey(key);
      if (mainDeleted) totalDeleted++;

      // Find and invalidate dependent patterns
      for (const [pattern, dependentPatterns] of this.invalidationPatterns.entries()) {
        if (this.matchesPattern(key, pattern)) {
          for (const dependentPattern of dependentPatterns) {
            const deleted = await this.invalidatePattern(dependentPattern);
            totalDeleted += deleted;
          }
        }
      }

      // Invalidate direct dependencies
      const dependencies = this.dependencies.get(key);
      if (dependencies) {
        for (const dependentKey of dependencies) {
          const deleted = await this.invalidateKey(dependentKey);
          if (deleted) totalDeleted++;
        }
      }

      logger.info('Cache invalidated with dependencies', { 
        key, 
        totalDeleted 
      });

      return totalDeleted;
    } catch (error) {
      logger.error('Error invalidating cache with dependencies', { 
        key, 
        error: error.message 
      });
      return 0;
    }
  }

  /**
   * Check if key matches pattern
   */
  matchesPattern(key, pattern) {
    // Convert Redis pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  /**
   * Invalidate user-related cache
   */
  async invalidateUser(userId) {
    const patterns = [
      `user:${userId}:*`,
      `users:*`,
      `auth:${userId}:*`,
      `profile:${userId}:*`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await this.invalidatePattern(pattern);
      totalDeleted += deleted;
    }

    logger.info('User cache invalidated', { userId, totalDeleted });
    return totalDeleted;
  }

  /**
   * Invalidate store-related cache
   */
  async invalidateStore(storeId) {
    const patterns = [
      `store:${storeId}:*`,
      `stores:*`,
      `store-stats:${storeId}:*`,
      `products:store:${storeId}:*`,
      `users:store:${storeId}:*`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await this.invalidatePattern(pattern);
      totalDeleted += deleted;
    }

    logger.info('Store cache invalidated', { storeId, totalDeleted });
    return totalDeleted;
  }

  /**
   * Invalidate product-related cache
   */
  async invalidateProduct(productId, storeId = null) {
    const patterns = [
      `product:${productId}:*`,
      `products:*`,
      `stock:product:${productId}:*`
    ];

    if (storeId) {
      patterns.push(`store:${storeId}:products:*`);
    }

    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await this.invalidatePattern(pattern);
      totalDeleted += deleted;
    }

    logger.info('Product cache invalidated', { productId, storeId, totalDeleted });
    return totalDeleted;
  }

  /**
   * Invalidate stock-related cache
   */
  async invalidateStock(productId, storeId = null) {
    const patterns = [
      `stock:${productId}:*`,
      `stock:*`,
      `product:${productId}:*`,
      `products:*`
    ];

    if (storeId) {
      patterns.push(`store:${storeId}:stock:*`);
    }

    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await this.invalidatePattern(pattern);
      totalDeleted += deleted;
    }

    logger.info('Stock cache invalidated', { productId, storeId, totalDeleted });
    return totalDeleted;
  }

  /**
   * Invalidate sales-related cache
   */
  async invalidateSale(saleId, storeId = null) {
    const patterns = [
      `sale:${saleId}:*`,
      `sales:*`,
      `reports:*`,
      `stock:*`
    ];

    if (storeId) {
      patterns.push(`store:${storeId}:sales:*`);
    }

    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await this.invalidatePattern(pattern);
      totalDeleted += deleted;
    }

    logger.info('Sale cache invalidated', { saleId, storeId, totalDeleted });
    return totalDeleted;
  }

  /**
   * Invalidate refund-related cache
   */
  async invalidateRefund(refundId, saleId = null, storeId = null) {
    const patterns = [
      `refund:${refundId}:*`,
      `refunds:*`,
      `stock:*`
    ];

    if (saleId) {
      patterns.push(`sale:${saleId}:*`);
    }

    if (storeId) {
      patterns.push(`store:${storeId}:refunds:*`);
    }

    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await this.invalidatePattern(pattern);
      totalDeleted += deleted;
    }

    logger.info('Refund cache invalidated', { refundId, saleId, storeId, totalDeleted });
    return totalDeleted;
  }

  /**
   * Invalidate cart-related cache
   */
  async invalidateCart(cartId, userId = null) {
    const patterns = [
      `cart:${cartId}:*`,
      `carts:*`
    ];

    if (userId) {
      patterns.push(`user:${userId}:cart:*`);
    }

    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await this.invalidatePattern(pattern);
      totalDeleted += deleted;
    }

    logger.info('Cart cache invalidated', { cartId, userId, totalDeleted });
    return totalDeleted;
  }

  /**
   * Invalidate all service cache
   */
  async invalidateAllService() {
    try {
      const deleted = await redisService.flushService();
      logger.info('All service cache invalidated', { success: deleted });
      return deleted;
    } catch (error) {
      logger.error('Error invalidating all service cache', { error: error.message });
      return false;
    }
  }

  /**
   * Invalidate by tags
   */
  async invalidateByTags(tags) {
    if (!Array.isArray(tags)) {
      tags = [tags];
    }

    let totalDeleted = 0;
    for (const tag of tags) {
      const pattern = `tag:${tag}:*`;
      const deleted = await this.invalidatePattern(pattern);
      totalDeleted += deleted;
    }

    logger.info('Cache invalidated by tags', { tags, totalDeleted });
    return totalDeleted;
  }

  /**
   * Schedule cache invalidation
   */
  scheduleInvalidation(key, delay) {
    setTimeout(async () => {
      await this.invalidateKey(key);
      logger.info('Scheduled cache invalidation executed', { key, delay });
    }, delay);
  }

  /**
   * Get cache invalidation statistics
   */
  getStats() {
    return {
      patterns: this.invalidationPatterns.size,
      dependencies: this.dependencies.size,
      availablePatterns: Array.from(this.invalidationPatterns.keys())
    };
  }
}

// Create singleton instance
const cacheInvalidation = new CacheInvalidationService();

// Export singleton instance and class
export { cacheInvalidation, CacheInvalidationService };
export default cacheInvalidation;
