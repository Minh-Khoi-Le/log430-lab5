/**
 * Stock Controller for Stock Service
 * 
 * This controller manages all stock-related operations in the microservices architecture.
 * It provides endpoints for inventory management, stock levels, and stock operations
 * across multiple stores.
 * 
 * Features:
 * - Stock level management across stores
 * - Inventory tracking and updates
 * - Stock availability queries
 * - Stock movement operations (transfers, adjustments)
 * - Integration with product and store services
 * - Comprehensive metrics and monitoring
 * 
 * @author Stock Service Team
 * @version 1.0.0
 */

import StockService from '../services/stock.service.js';
import { ApiError } from '../middleware/errorHandler.js';
import { promClient } from '../middleware/metrics.js';
import logger from '../utils/logger.js';

// Metrics for stock operations
const stockOperationCounter = new promClient.Counter({
  name: 'stock_operations_total',
  help: 'Total number of stock operations',
  labelNames: ['operation', 'status', 'store_id']
});

const stockOperationDuration = new promClient.Histogram({
  name: 'stock_operation_duration_seconds',
  help: 'Duration of stock operations in seconds',
  labelNames: ['operation']
});

const stockLevelGauge = new promClient.Gauge({
  name: 'stock_level_current',
  help: 'Current stock levels',
  labelNames: ['product_id', 'store_id']
});

/**
 * Get Stock by Product Controller
 * 
 * Retrieves stock information for a specific product across all stores.
 * Provides visibility into product availability across the entire network.
 * 
 * @param {Request} req - Express request object with product ID parameter
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * Parameters:
 * - productId: Product ID (integer)
 * 
 * Query Parameters:
 * - includeZero: Include stores with zero stock (default: false)
 * - minQuantity: Filter by minimum stock quantity
 * 
 * Response: 200 OK with stock data across stores
 */
export async function getByProduct(req, res, next) {
  const timer = stockOperationDuration.startTimer({ operation: 'get_by_product' });
  
  try {
    const { productId } = req.params;
    const { includeZero = false, minQuantity = 0 } = req.query;
    
    if (!productId || isNaN(parseInt(productId))) {
      throw new ApiError(400, 'Valid product ID is required');
    }
    
    const stocks = await StockService.getStockByProduct(parseInt(productId), {
      includeZero: includeZero === 'true',
      minQuantity: parseInt(minQuantity) || 0
    });
    
    // Update metrics
    stocks.forEach(stock => {
      stockLevelGauge.set(
        { product_id: stock.productId, store_id: stock.storeId },
        stock.quantity
      );
    });
    
    stockOperationCounter.inc({ operation: 'get_by_product', status: 'success' });
    
    logger.logStockOperation('get_by_product', { productId, resultCount: stocks.length }, req.user?.id);
    
    res.json({
      success: true,
      data: stocks,
      meta: {
        productId: parseInt(productId),
        totalStores: stocks.length,
        totalQuantity: stocks.reduce((sum, stock) => sum + stock.quantity, 0),
        availableStores: stocks.filter(stock => stock.quantity > 0).length
      }
    });
  } catch (error) {
    stockOperationCounter.inc({ operation: 'get_by_product', status: 'error' });
    next(error);
  } finally {
    timer();
  }
}

/**
 * Get Stock by Store Controller
 * 
 * Retrieves all stock information for a specific store.
 * Provides complete inventory view for store management.
 * 
 * @param {Request} req - Express request object with store ID parameter
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * Parameters:
 * - storeId: Store ID (integer)
 * 
 * Query Parameters:
 * - page: Page number for pagination (default: 1)
 * - limit: Items per page (default: 50, max: 200)
 * - includeZero: Include products with zero stock (default: false)
 * - category: Filter by product category
 * - lowStock: Show only low stock items (quantity < threshold)
 * - threshold: Low stock threshold (default: 10)
 * 
 * Response: 200 OK with paginated stock data for store
 */
export async function getByStore(req, res, next) {
  const timer = stockOperationDuration.startTimer({ operation: 'get_by_store' });
  
  try {
    const { storeId } = req.params;
    const { 
      page = 1, 
      limit = 50, 
      includeZero = false, 
      category,
      lowStock = false,
      threshold = 10
    } = req.query;
    
    if (!storeId || isNaN(parseInt(storeId))) {
      throw new ApiError(400, 'Valid store ID is required');
    }
    
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    
    const result = await StockService.getStockByStore(parseInt(storeId), {
      page: pageNum,
      limit: limitNum,
      includeZero: includeZero === 'true',
      category,
      lowStock: lowStock === 'true',
      threshold: parseInt(threshold) || 10
    });
    
    // Update metrics for each stock item
    result.stocks.forEach(stock => {
      stockLevelGauge.set(
        { product_id: stock.productId, store_id: stock.storeId },
        stock.quantity
      );
    });
    
    stockOperationCounter.inc({ 
      operation: 'get_by_store', 
      status: 'success', 
      store_id: storeId 
    });
    
    logger.logStockOperation('get_by_store', { 
      storeId, 
      resultCount: result.stocks.length,
      totalItems: result.total 
    }, req.user?.id);
    
    res.json({
      success: true,
      data: result.stocks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
        hasNext: pageNum < Math.ceil(result.total / limitNum),
        hasPrev: pageNum > 1
      },
      meta: {
        storeId: parseInt(storeId),
        totalProducts: result.total,
        inStock: result.inStockCount,
        outOfStock: result.outOfStockCount,
        lowStock: result.lowStockCount
      }
    });
  } catch (error) {
    stockOperationCounter.inc({ 
      operation: 'get_by_store', 
      status: 'error', 
      store_id: req.params.storeId 
    });
    next(error);
  } finally {
    timer();
  }
}

/**
 * Update Stock Controller
 * 
 * Updates stock quantity for a specific product in a specific store.
 * Supports both absolute updates and relative adjustments.
 * 
 * @param {Request} req - Express request object with stock update data
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * Body Requirements:
 * - productId: Product ID (integer)
 * - storeId: Store ID (integer)
 * - quantity: New quantity (integer, >= 0) OR adjustment amount if type is 'adjustment'
 * - type: Update type ('set' or 'adjustment') - default: 'set'
 * - reason: Reason for stock change (optional)
 * 
 * Response: 201 Created with updated stock information
 */
export async function updateStock(req, res, next) {
  const timer = stockOperationDuration.startTimer({ operation: 'update_stock' });
  
  try {
    const { productId, storeId, quantity, type = 'set', reason } = req.body;
    
    // Validation
    if (!productId || isNaN(parseInt(productId))) {
      throw new ApiError(400, 'Valid product ID is required');
    }
    
    if (!storeId || isNaN(parseInt(storeId))) {
      throw new ApiError(400, 'Valid store ID is required');
    }
    
    if (quantity === undefined || isNaN(parseInt(quantity))) {
      throw new ApiError(400, 'Valid quantity is required');
    }
    
    if (!['set', 'adjustment'].includes(type)) {
      throw new ApiError(400, 'Type must be either "set" or "adjustment"');
    }
    
    const updateData = {
      productId: parseInt(productId),
      storeId: parseInt(storeId),
      quantity: parseInt(quantity),
      type,
      reason,
      userId: req.user?.id
    };
    
    const stock = await StockService.updateStock(updateData);
    
    // Update metrics
    stockLevelGauge.set(
      { product_id: stock.productId, store_id: stock.storeId },
      stock.quantity
    );
    
    stockOperationCounter.inc({ 
      operation: 'update_stock', 
      status: 'success', 
      store_id: storeId 
    });
    
    logger.logStockOperation('update_stock', {
      productId: stock.productId,
      storeId: stock.storeId,
      oldQuantity: stock.previousQuantity,
      newQuantity: stock.quantity,
      type,
      reason
    }, req.user?.id);
    
    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      data: stock
    });
  } catch (error) {
    stockOperationCounter.inc({ 
      operation: 'update_stock', 
      status: 'error', 
      store_id: req.body.storeId 
    });
    next(error);
  } finally {
    timer();
  }
}

/**
 * Bulk Update Stock Controller
 * 
 * Updates multiple stock items in a single transaction.
 * Useful for inventory adjustments, transfers, and bulk operations.
 * 
 * @param {Request} req - Express request object with bulk update data
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * Body Requirements:
 * - updates: Array of stock updates
 *   - productId: Product ID (integer)
 *   - storeId: Store ID (integer)
 *   - quantity: New quantity or adjustment amount (integer)
 *   - type: 'set' or 'adjustment' (default: 'set')
 * - reason: Reason for bulk update (optional)
 * 
 * Response: 200 OK with bulk update results
 */
export async function bulkUpdateStock(req, res, next) {
  const timer = stockOperationDuration.startTimer({ operation: 'bulk_update_stock' });
  
  try {
    const { updates, reason } = req.body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new ApiError(400, 'Updates array is required and must not be empty');
    }
    
    if (updates.length > 100) {
      throw new ApiError(400, 'Maximum 100 updates allowed per request');
    }
    
    // Validate each update
    for (const update of updates) {
      if (!update.productId || isNaN(parseInt(update.productId))) {
        throw new ApiError(400, 'Each update must have a valid product ID');
      }
      if (!update.storeId || isNaN(parseInt(update.storeId))) {
        throw new ApiError(400, 'Each update must have a valid store ID');
      }
      if (update.quantity === undefined || isNaN(parseInt(update.quantity))) {
        throw new ApiError(400, 'Each update must have a valid quantity');
      }
      if (update.type && !['set', 'adjustment'].includes(update.type)) {
        throw new ApiError(400, 'Update type must be either "set" or "adjustment"');
      }
    }
    
    const updateData = {
      updates: updates.map(update => ({
        productId: parseInt(update.productId),
        storeId: parseInt(update.storeId),
        quantity: parseInt(update.quantity),
        type: update.type || 'set'
      })),
      reason,
      userId: req.user?.id
    };
    
    const results = await StockService.bulkUpdateStock(updateData);
    
    // Update metrics for successful updates
    results.successful.forEach(stock => {
      stockLevelGauge.set(
        { product_id: stock.productId, store_id: stock.storeId },
        stock.quantity
      );
    });
    
    stockOperationCounter.inc({ 
      operation: 'bulk_update_stock', 
      status: 'success'
    });
    
    logger.logStockOperation('bulk_update_stock', {
      totalUpdates: updates.length,
      successful: results.successful.length,
      failed: results.failed.length,
      reason
    }, req.user?.id);
    
    const statusCode = results.failed.length > 0 ? 207 : 200; // 207 Multi-Status if some failed
    
    res.status(statusCode).json({
      success: results.failed.length === 0,
      message: `Bulk update completed. ${results.successful.length} successful, ${results.failed.length} failed`,
      data: {
        successful: results.successful,
        failed: results.failed,
        summary: {
          total: updates.length,
          successful: results.successful.length,
          failed: results.failed.length
        }
      }
    });
  } catch (error) {
    stockOperationCounter.inc({ 
      operation: 'bulk_update_stock', 
      status: 'error'
    });
    next(error);
  } finally {
    timer();
  }
}

/**
 * Transfer Stock Controller
 * 
 * Transfers stock from one store to another.
 * Ensures atomic operation with proper validation.
 * 
 * @param {Request} req - Express request object with transfer data
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * Body Requirements:
 * - productId: Product ID (integer)
 * - fromStoreId: Source store ID (integer)
 * - toStoreId: Destination store ID (integer)
 * - quantity: Quantity to transfer (integer, > 0)
 * - reason: Reason for transfer (optional)
 * 
 * Response: 200 OK with transfer details
 */
export async function transferStock(req, res, next) {
  const timer = stockOperationDuration.startTimer({ operation: 'transfer_stock' });
  
  try {
    const { productId, fromStoreId, toStoreId, quantity, reason } = req.body;
    
    // Validation
    if (!productId || isNaN(parseInt(productId))) {
      throw new ApiError(400, 'Valid product ID is required');
    }
    
    if (!fromStoreId || isNaN(parseInt(fromStoreId))) {
      throw new ApiError(400, 'Valid source store ID is required');
    }
    
    if (!toStoreId || isNaN(parseInt(toStoreId))) {
      throw new ApiError(400, 'Valid destination store ID is required');
    }
    
    if (!quantity || isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
      throw new ApiError(400, 'Valid quantity greater than 0 is required');
    }
    
    if (parseInt(fromStoreId) === parseInt(toStoreId)) {
      throw new ApiError(400, 'Source and destination stores must be different');
    }
    
    const transferData = {
      productId: parseInt(productId),
      fromStoreId: parseInt(fromStoreId),
      toStoreId: parseInt(toStoreId),
      quantity: parseInt(quantity),
      reason,
      userId: req.user?.id
    };
    
    const result = await StockService.transferStock(transferData);
    
    // Update metrics for both stores
    stockLevelGauge.set(
      { product_id: result.fromStock.productId, store_id: result.fromStock.storeId },
      result.fromStock.quantity
    );
    stockLevelGauge.set(
      { product_id: result.toStock.productId, store_id: result.toStock.storeId },
      result.toStock.quantity
    );
    
    stockOperationCounter.inc({ 
      operation: 'transfer_stock', 
      status: 'success', 
      store_id: `${fromStoreId}_to_${toStoreId}` 
    });
    
    logger.logStockOperation('transfer_stock', {
      productId: result.productId,
      fromStoreId,
      toStoreId,
      quantity,
      reason,
      transferId: result.transferId
    }, req.user?.id);
    
    res.json({
      success: true,
      message: 'Stock transferred successfully',
      data: result
    });
  } catch (error) {
    stockOperationCounter.inc({ 
      operation: 'transfer_stock', 
      status: 'error', 
      store_id: `${req.body.fromStoreId}_to_${req.body.toStoreId}` 
    });
    next(error);
  } finally {
    timer();
  }
}

/**
 * Get Stock Summary Controller
 * 
 * Provides aggregated stock information and analytics.
 * Useful for dashboards and inventory management overview.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * Query Parameters:
 * - storeId: Filter by specific store (optional)
 * - productId: Filter by specific product (optional)
 * - category: Filter by product category (optional)
 * - lowStockThreshold: Threshold for low stock alerts (default: 10)
 * 
 * Response: 200 OK with stock summary and analytics
 */
export async function getStockSummary(req, res, next) {
  const timer = stockOperationDuration.startTimer({ operation: 'get_stock_summary' });
  
  try {
    const { storeId, productId, category, lowStockThreshold = 10 } = req.query;
    
    const filters = {};
    if (storeId && !isNaN(parseInt(storeId))) {
      filters.storeId = parseInt(storeId);
    }
    if (productId && !isNaN(parseInt(productId))) {
      filters.productId = parseInt(productId);
    }
    if (category) {
      filters.category = category;
    }
    filters.lowStockThreshold = parseInt(lowStockThreshold) || 10;
    
    const summary = await StockService.getStockSummary(filters);
    
    stockOperationCounter.inc({ 
      operation: 'get_stock_summary', 
      status: 'success'
    });
    
    logger.logStockOperation('get_stock_summary', {
      filters,
      resultSummary: {
        totalProducts: summary.totalProducts,
        totalStores: summary.totalStores,
        lowStockItems: summary.lowStockItems.length
      }
    }, req.user?.id);
    
    res.json({
      success: true,
      data: summary,
      meta: {
        filters,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    stockOperationCounter.inc({ 
      operation: 'get_stock_summary', 
      status: 'error'
    });
    next(error);
  } finally {
    timer();
  }
}

export default {
  getByProduct,
  getByStore,
  updateStock,
  bulkUpdateStock,
  transferStock,
  getStockSummary
};
