/**
 * Stock Service Business Logic
 * 
 * This service handles the core business logic for stock management operations.
 * It provides a comprehensive interface for inventory mana      // Get additional metadata
      const [inStockCount, outOfStockCount, lowStockCount] = await Promise.all([
        getPrisma().stock.count({ 
          where: { storeId, quantity: { gt: 0 } } 
        }),
        getPrisma().stock.count({ 
          where: { storeId, quantity: 0 } 
        }),
        getPrisma().stock.count({ 
          where: { storeId, quantity: { lt: thresho        // Total stock items
        getPrisma().stock.count({ where }),
        
        // In stock items
        getPrisma().stock.count({ 
          where: { ...where, quantity: { gt: 0 } } 
        }),
        
        // Out of stock items
        getPrisma().stock.count({ 
          where: { ...where, quantity: 0 } 
        }),
        
        // Low stock items (with pagination)
        getPrisma().stock.findMany({
        })
      ]);k tracking,
 * and stock operations across multiple stores.
 * 
 * Features:
 * - Stock level management with validation
 * - Atomic stock operations and transfers
 * - Stock analytics and reporting
 * - Integration with product and store validation
 * - Cache management for performance
 * - Audit trail for stock movements
 * 
 * @author Stock Service Team
 * @version 1.0.0
 */

import { 
  getDatabaseClient, 
  logger,
  BaseError,
  redisClient
} from '../../shared/index.js';

// Get shared database client
function getPrisma() {
  return getDatabaseClient('stock-service');
}

/**
 * Stock-specific cache utility functions
 */
async function getCachedStockData(type, identifier) {
  try {
    const redis = redisClient;
    if (!redis) {
      logger.warn('Redis client not available');
      return null;
    }
    const key = `stock-service:${type}:${identifier}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logger.warn('Stock cache retrieval failed', { type, identifier, error: error.message });
    return null;
  }
}

async function cacheStockData(type, identifier, data, ttl = 300) {
  try {
    const redis = redisClient;
    if (!redis) {
      logger.warn('Redis client not available');
      return;
    }
    const key = `stock-service:${type}:${identifier}`;
    if (redis.setEx) {
      await redis.setEx(key, ttl, JSON.stringify(data));
    } else if (redis.setex) {
      await redis.setex(key, ttl, JSON.stringify(data));
    } else {
      // Fallback for different Redis client versions
      await redis.set(key, JSON.stringify(data), 'EX', ttl);
    }
    logger.debug('Stock data cached', { type, identifier, ttl });
  } catch (error) {
    logger.warn('Stock cache storage failed', { type, identifier, error: error.message });
  }
}

/**
 * Stock Service Class
 * 
 * Encapsulates all stock-related business logic and data operations.
 * Provides methods for managing inventory with proper validation and error handling.
 */
class StockService {
  
  /**
   * Get stock information for a specific product across all stores
   * 
   * @param {number} productId - Product ID
   * @param {Object} options - Query options
   * @param {boolean} options.includeZero - Include stores with zero stock
   * @param {number} options.minQuantity - Minimum quantity filter
   * @returns {Promise<Array>} Stock information across stores
   */
  static async getStockByProduct(productId, options = {}) {
    const { includeZero = false, minQuantity = 0 } = options;
    
    try {
      // Check cache first
      const cacheKey = `product_stock_${productId}_${includeZero}_${minQuantity}`;
      const cachedData = await getCachedStockData('product', productId);
      
      if (cachedData) {
        logger.debug('Cache hit', { cacheKey });
        return cachedData;
      }
      
      // Build where clause
      const where = {
        productId,
        ...(minQuantity > 0 && { quantity: { gte: minQuantity } }),
        ...(!includeZero && { quantity: { gt: 0 } })
      };
      
      const stocks = await getPrisma().stock.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              description: true
            }
          },
          store: {
            select: {
              id: true,
              name: true,
              address: true
            }
          }
        },
        orderBy: [
          { quantity: 'desc' },
          { store: { name: 'asc' } }
        ]
      });
      
      // Transform data for response
      const transformedStocks = stocks.map(stock => ({
        id: stock.id,
        productId: stock.productId,
        storeId: stock.storeId,
        quantity: stock.quantity,
        availableQuantity: stock.quantity, 
        product: stock.product,
        store: stock.store
      }));
      
      // Cache the result
      await cacheStockData('product', productId, transformedStocks, 300);
      
      return transformedStocks;
    } catch (error) {
      logger.error('Error fetching stock by product:', { productId, error: error.message });
      throw new BaseError('Failed to fetch stock information', 500);
    }
  }
  
  /**
   * Get stock information for a specific store with pagination
   * 
   * @param {number} storeId - Store ID
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {boolean} options.includeZero - Include products with zero stock
   * @param {boolean} options.lowStock - Show only low stock items
   * @param {number} options.threshold - Low stock threshold
   * @returns {Promise<Object>} Paginated stock information with metadata
   */
  static async getStockByStore(storeId, options = {}) {
    const { 
      page = 1, 
      limit = 50, 
      includeZero = false, 
      lowStock = false,
      threshold = 10
    } = options;
    
    try {
      const skip = (page - 1) * limit;
      
      // Build where clause
      const where = {
        storeId,
        ...(!includeZero && { quantity: { gt: 0 } }),
        ...(lowStock && { quantity: { lt: threshold, gt: 0 } })
      };
      
      // Get stocks with pagination
      const [stocks, total] = await Promise.all([
        getPrisma().stock.findMany({
          where,
          skip,
          take: limit,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                description: true
              }
            }
          },
          orderBy: [
            { quantity: 'asc' }, // Show low stock first
            { product: { name: 'asc' } }
          ]
        }),
        getPrisma().stock.count({ where })
      ]);
      
      // Get additional metadata
      const [inStockCount, outOfStockCount, lowStockCount] = await Promise.all([
        getPrisma().stock.count({ 
          where: { storeId, quantity: { gt: 0 } } 
        }),
        getPrisma().stock.count({ 
          where: { storeId, quantity: 0 } 
        }),
        getPrisma().stock.count({ 
          where: { storeId, quantity: { lt: threshold, gt: 0 } } 
        })
      ]);
      
      // Transform data for response
      const transformedStocks = stocks.map(stock => ({
        id: stock.id,
        productId: stock.productId,
        storeId: stock.storeId,
        quantity: stock.quantity,
        availableQuantity: stock.quantity, 
        isLowStock: stock.quantity > 0 && stock.quantity < threshold,
        product: stock.product
      }));
      
      return {
        stocks: transformedStocks,
        total,
        inStockCount,
        outOfStockCount,
        lowStockCount
      };
    } catch (error) {
      logger.error('Error fetching stock by store:', { storeId, error: error.message });
      throw new BaseError('Failed to fetch store stock information', 500);
    }
  }
  
  /**
   * Update stock quantity for a product in a store
   * 
   * @param {Object} updateData - Stock update data
   * @param {number} updateData.productId - Product ID
   * @param {number} updateData.storeId - Store ID
   * @param {number} updateData.quantity - New quantity or adjustment amount
   * @param {string} updateData.type - Update type ('set' or 'adjustment')
   * @param {string} updateData.reason - Reason for update
   * @param {number} updateData.userId - User performing the update
   * @returns {Promise<Object>} Updated stock information
   */
  static async updateStock(updateData) {
    const { productId, storeId, quantity, type, reason, userId } = updateData;
    
    try {
      const prisma = getPrisma();
      return await prisma.$transaction(async (tx) => {
        // Get current stock
        let stock = await tx.stock.findFirst({
          where: { productId, storeId },
          include: {
            product: { select: { id: true, name: true } },
            store: { select: { id: true, name: true } }
          }
        });
        
        const previousQuantity = stock?.quantity || 0;
        let newQuantity;
        
        if (type === 'adjustment') {
          newQuantity = Math.max(0, previousQuantity + quantity);
        } else {
          newQuantity = Math.max(0, quantity);
        }
        
        // Validate the operation
        if (type === 'adjustment' && quantity < 0 && Math.abs(quantity) > previousQuantity) {
          throw new BaseError(`Insufficient stock. Current quantity: ${previousQuantity}, requested adjustment: ${quantity}`, 400);
        }
        
        // Create or update stock record
        if (stock) {
          stock = await tx.stock.update({
            where: { id: stock.id },
            data: { 
              quantity: newQuantity
            },
            include: {
              product: { select: { id: true, name: true } },
              store: { select: { id: true, name: true } }
            }
          });
        } else {
          // Create new stock record if it doesn't exist
          stock = await tx.stock.create({
            data: {
              productId,
              storeId,
              quantity: newQuantity
            },
            include: {
              product: { select: { id: true, name: true } },
              store: { select: { id: true, name: true } }
            }
          });
        }
        // Determine movement type (for logging purposes)
        let movementType;
        if (type === 'adjustment') {
          movementType = quantity > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
        } else {
          movementType = 'MANUAL_SET';
        }
        
        // Log the stock movement for audit purposes
        logger.info('Stock movement recorded', {
          productId,
          storeId,
          movementType,
          quantity: type === 'adjustment' ? Math.abs(quantity) : newQuantity,
          previousQuantity,
          newQuantity,
          reason: reason || 'Manual stock update',
          userId
        });
        
        // Log detailed stock update information for debugging
        logger.info('Stock update completed successfully', {
          productId,
          storeId,
          operation: type,
          changeAmount: newQuantity - previousQuantity,
          beforeUpdate: previousQuantity,
          afterUpdate: newQuantity,
          timestamp: new Date().toISOString()
        });
        
        // Invalidate product cache since stock data affects product listings
        await this.invalidateProductCache(productId);
        
        return {
          ...stock,
          previousQuantity,
          changeAmount: newQuantity - previousQuantity,
          changeType: type
        };
      });
    } catch (error) {
      if (error instanceof BaseError) {
        throw error;
      }
      logger.error('Error updating stock:', { updateData, error: error.message });
      throw new BaseError('Failed to update stock', 500);
    }
  }
  
  /**
   * Bulk update multiple stock items
   * 
   * @param {Object} bulkData - Bulk update data
   * @param {Array} bulkData.updates - Array of stock updates
   * @param {string} bulkData.reason - Reason for bulk update
   * @param {number} bulkData.userId - User performing the updates
   * @returns {Promise<Object>} Bulk update results
   */
  static async bulkUpdateStock(bulkData) {
    const { updates, reason, userId } = bulkData;
    const successful = [];
    const failed = [];
    
    try {
      // Process updates in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (update) => {
          try {
            const result = await this.updateStock({
              ...update,
              reason: reason || 'Bulk stock update',
              userId
            });
            successful.push(result);
          } catch (error) {
            failed.push({
              ...update,
              error: error.message
            });
          }
        });
        
        await Promise.all(batchPromises);
      }
      
      return { successful, failed };
    } catch (error) {
      logger.error('Error in bulk stock update:', { error: error.message });
      throw new BaseError('Failed to process bulk stock update', 500);
    }
  }
  
  /**
   * Transfer stock from one store to another
   * 
   * @param {Object} transferData - Transfer data
   * @param {number} transferData.productId - Product ID
   * @param {number} transferData.fromStoreId - Source store ID
   * @param {number} transferData.toStoreId - Destination store ID
   * @param {number} transferData.quantity - Quantity to transfer
   * @param {string} transferData.reason - Reason for transfer
   * @param {number} transferData.userId - User performing the transfer
   * @returns {Promise<Object>} Transfer results
   */
  static async transferStock(transferData) {
    const { productId, fromStoreId, toStoreId, quantity, reason, userId } = transferData;
    
    try {
      const prisma = getPrisma();
      return await prisma.$transaction(async (tx) => {
        // Get source stock
        const fromStock = await tx.stock.findFirst({
          where: { productId, storeId: fromStoreId }
        });
        
        if (!fromStock || fromStock.quantity < quantity) {
          throw new BaseError(`Insufficient stock in source store. Available: ${fromStock?.quantity || 0}, requested: ${quantity}`, 400);
        }
        
        // Get or create destination stock
        let toStock = await tx.stock.findFirst({
          where: { productId, storeId: toStoreId }
        });
        
        // Update source stock (decrease)
        const updatedFromStock = await tx.stock.update({
          where: { id: fromStock.id },
          data: { 
            quantity: fromStock.quantity - quantity,
            updatedAt: new Date()
          },
          include: {
            product: { select: { id: true, name: true } },
            store: { select: { id: true, name: true } }
          }
        });
        
        // Update or create destination stock (increase)
        let updatedToStock;
        if (toStock) {
          updatedToStock = await tx.stock.update({
            where: { id: toStock.id },
            data: { 
              quantity: toStock.quantity + quantity,
              updatedAt: new Date()
            },
            include: {
              product: { select: { id: true, name: true } },
              store: { select: { id: true, name: true } }
            }
          });
        } else {
          updatedToStock = await tx.stock.create({
            data: {
              productId,
              storeId: toStoreId,
              quantity
            },
            include: {
              product: { select: { id: true, name: true } },
              store: { select: { id: true, name: true } }
            }
          });
        }
        
        // Log transfer for audit purposes
        const transferId = `${Date.now()}-${productId}-${fromStoreId}-${toStoreId}`;
        logger.info('Stock transfer recorded', {
          transferId,
          productId,
          fromStoreId,
          toStoreId,
          quantity,
          reason: reason || 'Stock transfer',
          userId,
          status: 'COMPLETED'
        });
        
        // Log movement records for audit trail
        logger.info('Stock transfer movements', {
          outbound: {
            productId,
            storeId: fromStoreId,
            movementType: 'TRANSFER_OUT',
            quantity,
            previousQuantity: fromStock.quantity,
            newQuantity: fromStock.quantity - quantity,
            reason: `Transfer to store ${toStoreId}: ${reason || 'Stock transfer'}`,
            transferId,
            userId
          },
          inbound: {
            productId,
            storeId: toStoreId,
            movementType: 'TRANSFER_IN',
            quantity,
            previousQuantity: toStock?.quantity || 0,
            newQuantity: (toStock?.quantity || 0) + quantity,
            reason: `Transfer from store ${fromStoreId}: ${reason || 'Stock transfer'}`,
            transferId,
            userId
          }
        });
        
        // Invalidate product cache since stock data affects product listings
        await this.invalidateProductCache(productId);
        
        return {
          transferId,
          productId,
          fromStock: updatedFromStock,
          toStock: updatedToStock,
          transferredQuantity: quantity,
          reason,
          completedAt: new Date().toISOString()
        };
      });
    } catch (error) {
      if (error instanceof BaseError) {
        throw error;
      }
      logger.error('Error transferring stock:', { transferData, error: error.message });
      throw new BaseError('Failed to transfer stock', 500);
    }
  }
  
  /**
   * Get stock summary and analytics
   * 
   * @param {Object} filters - Filter options
   * @param {number} filters.storeId - Filter by store
   * @param {number} filters.productId - Filter by product
   * @param {number} filters.lowStockThreshold - Low stock threshold
   * @returns {Promise<Object>} Stock summary and analytics
   */
  static async getStockSummary(filters = {}) {
    const { storeId, productId, lowStockThreshold = 10 } = filters;
    
    try {
      // Check cache first
      const cacheKey = `summary_${JSON.stringify(filters)}`;
      const cachedData = await getCachedStockData('summary', cacheKey);
      
      if (cachedData) {
        return cachedData;
      }
      
      // Build where clause
      const where = {
        ...(storeId && { storeId }),
        ...(productId && { productId })
      };
      
      // Get summary statistics
      const [
        totalItems,
        inStockItems,
        outOfStockItems,
        lowStockItems,
        totalValue,
        topProducts
      ] = await Promise.all([
        // Total stock items
        getPrisma().stock.count({ where }),
        
        // In stock items
        getPrisma().stock.count({ 
          where: { ...where, quantity: { gt: 0 } } 
        }),
        
        // Out of stock items
        getPrisma().stock.count({ 
          where: { ...where, quantity: 0 } 
        }),
        
        // Low stock items
        getPrisma().stock.findMany({
          where: { 
            ...where, 
            quantity: { lt: lowStockThreshold, gt: 0 } 
          },
          include: {
            product: { select: { id: true, name: true, description: true } },
            store: { select: { id: true, name: true } }
          },
          orderBy: { quantity: 'asc' },
          take: 20
        }),
        
        // Total inventory value
        getPrisma().stock.aggregate({
          where,
          _sum: {
            quantity: true
          }
        }),
        
        // Top products by quantity
        getPrisma().stock.findMany({
          where,
          include: {
            product: { select: { id: true, name: true, price: true, description: true } }
          },
          orderBy: { quantity: 'desc' },
          take: 10
        })
      ]);
      
      // Get unique stores and products count
      const [totalStores, totalProducts] = await Promise.all([
        getPrisma().stock.groupBy({
          by: ['storeId'],
          where,
          _count: true
        }).then(groups => groups.length),
        
        getPrisma().stock.groupBy({
          by: ['productId'],
          where,
          _count: true
        }).then(groups => groups.length)
      ]);
      
      const summary = {
        overview: {
          totalItems,
          inStockItems,
          outOfStockItems,
          lowStockItems: lowStockItems.length,
          totalStores,
          totalProducts,
          totalQuantity: totalValue._sum.quantity || 0
        },
        lowStockItems: lowStockItems.map(item => ({
          id: item.id,
          productId: item.productId,
          storeId: item.storeId,
          quantity: item.quantity,
          product: item.product,
          store: item.store
        })),
        topProducts: topProducts.map(item => ({
          productId: item.productId,
          storeId: item.storeId,
          quantity: item.quantity,
          product: item.product,
          estimatedValue: item.quantity * (item.product.price || 0)
        })),
        recentMovements: [], // No movement tracking table in current schema
        generatedAt: new Date().toISOString()
      };
      
      // Cache the result
      await cacheStockData('summary', cacheKey, summary, 600); // Cache for 10 minutes
      
      return summary;
    } catch (error) {
      logger.error('Error generating stock summary:', { filters, error: error.message });
      throw new BaseError('Failed to generate stock summary', 500);
    }
  }
  
  /**
   * Check stock availability for a product in a store
   * 
   * @param {number} productId - Product ID
   * @param {number} storeId - Store ID
   * @param {number} requestedQuantity - Requested quantity
   * @returns {Promise<Object>} Availability information
   */
  static async checkAvailability(productId, storeId, requestedQuantity) {
    try {
      const stock = await getPrisma().stock.findFirst({
        where: { productId, storeId },
        include: {
          product: { select: { id: true, name: true } },
          store: { select: { id: true, name: true } }
        }
      });
      
      
      const availableQuantity = stock ? stock.quantity : 0;
      const isAvailable = availableQuantity >= requestedQuantity;
      
      return {
        productId,
        storeId,
        requestedQuantity,
        availableQuantity,
        totalQuantity: stock?.quantity || 0,
        isAvailable,
        shortage: isAvailable ? 0 : requestedQuantity - availableQuantity,
        product: stock?.product,
        store: stock?.store
      };
    } catch (error) {
      logger.error('Error checking stock availability:', { productId, storeId, requestedQuantity, error: error.message });
      throw new BaseError('Failed to check stock availability', 500);
    }
  }

  /**
   * Invalidate product cache after stock update
   * 
   * This method tries to invalidate the product service cache to ensure
   * that product listings reflect updated stock information immediately.
   * 
   * @param {number} productId - Product ID whose cache should be invalidated
   */
  static async invalidateProductCache(productId) {
    try {
      // Try to call product service cache invalidation endpoint
      const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3001';
      
      // Make a request to invalidate cache for this specific product
      const axios = await import('axios');
      await axios.default.post(`${productServiceUrl}/products/internal/cache/invalidate`, {
        keys: [`products`, `product-${productId}`, `product-catalog`],
        reason: 'Stock update'
      }, {
        timeout: 2000, // 2 second timeout
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service': 'stock-service'
        }
      });
      
      logger.debug('Product cache invalidated successfully', { productId });
    } catch (error) {
      // Don't fail the stock update if cache invalidation fails
      logger.warn('Failed to invalidate product cache', { 
        productId, 
        error: error.message 
      });
    }
  }

  /**
   * Cache management methods
   */
  static async getCachedResult(key) {
    try {
      const redis = redisClient;
      if (!redis) {
        logger.warn('Redis client not available');
        return null;
      }
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.warn('Cache retrieval failed', { key, error: error.message });
      return null;
    }
  }

  static async setCachedResult(key, data, ttl = 300) {
    try {
      const redis = redisClient;
      if (!redis) {
        logger.warn('Redis client not available');
        return;
      }
      if (redis.setEx) {
        await redis.setEx(key, ttl, JSON.stringify(data));
      } else if (redis.setex) {
        await redis.setex(key, ttl, JSON.stringify(data));
      } else {
        // Fallback for different Redis client versions
        await redis.set(key, JSON.stringify(data), 'EX', ttl);
      }
    } catch (error) {
      logger.warn('Cache storage failed', { key, error: error.message });
    }
  }

  /**
   * Verify current stock levels for debugging purposes
   * 
   * @param {number} productId - Product ID to check
   * @param {number} storeId - Store ID to check
   * @returns {Promise<Object>} Current stock information
   */
  static async verifyStockLevel(productId, storeId) {
    try {
      const stock = await getPrisma().stock.findFirst({
        where: { productId, storeId },
        include: {
          product: { select: { id: true, name: true } },
          store: { select: { id: true, name: true } }
        }
      });
      
      const result = {
        productId,
        storeId,
        currentQuantity: stock?.quantity || 0,
        stockExists: !!stock,
        product: stock?.product,
        store: stock?.store,
        timestamp: new Date().toISOString()
      };
      
      logger.info('Stock verification completed', result);
      
      return result;
    } catch (error) {
      logger.error('Error verifying stock level:', { productId, storeId, error: error.message });
      throw new BaseError('Failed to verify stock level', 500);
    }
  }
}

export default StockService;
