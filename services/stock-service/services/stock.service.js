/**
 * Stock Service Business Logic
 * 
 * This service handles the core business logic for stock management operations.
 * It provides a comprehensive interface for inventory management, stock tracking,
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

import { PrismaClient } from '@prisma/client';
import { BaseError } from '@log430/shared/middleware/errorHandler.js';
import logger from '../utils/logger.js';
import { 
  cacheStockData, 
  getCachedStockData, 
  invalidateStockCache,
  deleteCachePattern 
} from '../utils/redis.js';

const prisma = new PrismaClient();

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
        logger.logCacheOperation('hit', cacheKey);
        return cachedData;
      }
      
      // Build where clause
      const where = {
        productId,
        ...(minQuantity > 0 && { quantity: { gte: minQuantity } }),
        ...(!includeZero && { quantity: { gt: 0 } })
      };
      
      const stocks = await prisma.stock.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
              price: true
            }
          },
          store: {
            select: {
              id: true,
              name: true,
              city: true,
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
        reservedQuantity: stock.reservedQuantity || 0,
        availableQuantity: stock.quantity - (stock.reservedQuantity || 0),
        lastUpdated: stock.updatedAt,
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
   * @param {string} options.category - Product category filter
   * @param {boolean} options.lowStock - Show only low stock items
   * @param {number} options.threshold - Low stock threshold
   * @returns {Promise<Object>} Paginated stock information with metadata
   */
  static async getStockByStore(storeId, options = {}) {
    const { 
      page = 1, 
      limit = 50, 
      includeZero = false, 
      category,
      lowStock = false,
      threshold = 10
    } = options;
    
    try {
      const skip = (page - 1) * limit;
      
      // Build where clause
      const where = {
        storeId,
        ...(!includeZero && { quantity: { gt: 0 } }),
        ...(lowStock && { quantity: { lt: threshold, gt: 0 } }),
        ...(category && { 
          product: { 
            category: { 
              contains: category, 
              mode: 'insensitive' 
            } 
          } 
        })
      };
      
      // Get stocks with pagination
      const [stocks, total] = await Promise.all([
        prisma.stock.findMany({
          where,
          skip,
          take: limit,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
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
        prisma.stock.count({ where })
      ]);
      
      // Get additional metadata
      const [inStockCount, outOfStockCount, lowStockCount] = await Promise.all([
        prisma.stock.count({ 
          where: { storeId, quantity: { gt: 0 } } 
        }),
        prisma.stock.count({ 
          where: { storeId, quantity: 0 } 
        }),
        prisma.stock.count({ 
          where: { storeId, quantity: { lt: threshold, gt: 0 } } 
        })
      ]);
      
      // Transform data for response
      const transformedStocks = stocks.map(stock => ({
        id: stock.id,
        productId: stock.productId,
        storeId: stock.storeId,
        quantity: stock.quantity,
        reservedQuantity: stock.reservedQuantity || 0,
        availableQuantity: stock.quantity - (stock.reservedQuantity || 0),
        isLowStock: stock.quantity > 0 && stock.quantity < threshold,
        lastUpdated: stock.updatedAt,
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
              quantity: newQuantity,
              updatedAt: new Date()
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
        
        // Create stock movement record for audit trail
        await tx.stockMovement.create({
          data: {
            productId,
            storeId,
            movementType: type === 'adjustment' ? 
              (quantity > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT') : 
              'MANUAL_SET',
            quantity: type === 'adjustment' ? Math.abs(quantity) : newQuantity,
            previousQuantity,
            newQuantity,
            reason: reason || 'Manual stock update',
            userId,
            createdAt: new Date()
          }
        });
        
        // Invalidate related caches
        await Promise.all([
          invalidateStockCache('product', productId),
          invalidateStockCache('store', storeId),
          deleteCachePattern(`stock:summary:*`)
        ]);
        
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
        
        // Create transfer record
        const transfer = await tx.stockTransfer.create({
          data: {
            productId,
            fromStoreId,
            toStoreId,
            quantity,
            reason: reason || 'Stock transfer',
            userId,
            status: 'COMPLETED',
            createdAt: new Date()
          }
        });
        
        // Create movement records for audit trail
        await Promise.all([
          // Outbound movement from source store
          tx.stockMovement.create({
            data: {
              productId,
              storeId: fromStoreId,
              movementType: 'TRANSFER_OUT',
              quantity,
              previousQuantity: fromStock.quantity,
              newQuantity: fromStock.quantity - quantity,
              reason: `Transfer to store ${toStoreId}: ${reason || 'Stock transfer'}`,
              referenceId: transfer.id,
              userId,
              createdAt: new Date()
            }
          }),
          // Inbound movement to destination store
          tx.stockMovement.create({
            data: {
              productId,
              storeId: toStoreId,
              movementType: 'TRANSFER_IN',
              quantity,
              previousQuantity: toStock?.quantity || 0,
              newQuantity: (toStock?.quantity || 0) + quantity,
              reason: `Transfer from store ${fromStoreId}: ${reason || 'Stock transfer'}`,
              referenceId: transfer.id,
              userId,
              createdAt: new Date()
            }
          })
        ]);
        
        // Invalidate caches
        await Promise.all([
          invalidateStockCache('product', productId),
          invalidateStockCache('store', fromStoreId),
          invalidateStockCache('store', toStoreId),
          deleteCachePattern(`stock:summary:*`)
        ]);
        
        return {
          transferId: transfer.id,
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
   * @param {string} filters.category - Filter by category
   * @param {number} filters.lowStockThreshold - Low stock threshold
   * @returns {Promise<Object>} Stock summary and analytics
   */
  static async getStockSummary(filters = {}) {
    const { storeId, productId, category, lowStockThreshold = 10 } = filters;
    
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
        ...(productId && { productId }),
        ...(category && { 
          product: { 
            category: { 
              contains: category, 
              mode: 'insensitive' 
            } 
          } 
        })
      };
      
      // Get summary statistics
      const [
        totalItems,
        inStockItems,
        outOfStockItems,
        lowStockItems,
        totalValue,
        topProducts,
        recentMovements
      ] = await Promise.all([
        // Total stock items
        prisma.stock.count({ where }),
        
        // In stock items
        prisma.stock.count({ 
          where: { ...where, quantity: { gt: 0 } } 
        }),
        
        // Out of stock items
        prisma.stock.count({ 
          where: { ...where, quantity: 0 } 
        }),
        
        // Low stock items
        prisma.stock.findMany({
          where: { 
            ...where, 
            quantity: { lt: lowStockThreshold, gt: 0 } 
          },
          include: {
            product: { select: { id: true, name: true, category: true } },
            store: { select: { id: true, name: true } }
          },
          orderBy: { quantity: 'asc' },
          take: 20
        }),
        
        // Total inventory value
        prisma.stock.aggregate({
          where,
          _sum: {
            quantity: true
          }
        }),
        
        // Top products by quantity
        prisma.stock.findMany({
          where,
          include: {
            product: { select: { id: true, name: true, category: true, price: true } }
          },
          orderBy: { quantity: 'desc' },
          take: 10
        }),
        
        // Recent stock movements
        prisma.stockMovement.findMany({
          where: {
            ...(storeId && { storeId }),
            ...(productId && { productId })
          },
          include: {
            product: { select: { id: true, name: true } },
            store: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ]);
      
      // Get unique stores and products count
      const [totalStores, totalProducts] = await Promise.all([
        prisma.stock.groupBy({
          by: ['storeId'],
          where,
          _count: true
        }).then(groups => groups.length),
        
        prisma.stock.groupBy({
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
        recentMovements: recentMovements.map(movement => ({
          id: movement.id,
          productId: movement.productId,
          storeId: movement.storeId,
          movementType: movement.movementType,
          quantity: movement.quantity,
          reason: movement.reason,
          createdAt: movement.createdAt,
          product: movement.product,
          store: movement.store
        })),
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
      const stock = await prisma.stock.findFirst({
        where: { productId, storeId },
        include: {
          product: { select: { id: true, name: true } },
          store: { select: { id: true, name: true } }
        }
      });
      
      const availableQuantity = stock ? stock.quantity - (stock.reservedQuantity || 0) : 0;
      const isAvailable = availableQuantity >= requestedQuantity;
      
      return {
        productId,
        storeId,
        requestedQuantity,
        availableQuantity,
        reservedQuantity: stock?.reservedQuantity || 0,
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
}

export default StockService;
