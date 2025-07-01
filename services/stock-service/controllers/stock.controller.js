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
 * @version 2.0.0
 */

import StockService from '../services/stock.service.js';

// Import shared components
import {
  ValidationError,
  logger,
  asyncHandler,
  recordOperation
} from '../../shared/index.js';

/**
 * Get Stock by Product Controller
 * 
 * Retrieves stock information for a specific product across all stores
 */
export const getByProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { includeZero = false, minQuantity } = req.query;

  // Input validation
  if (!productId || isNaN(productId)) {
    throw new ValidationError('Valid product ID is required');
  }

  logger.info('Retrieving stock by product', {
    productId,
    includeZero,
    minQuantity,
    userId: req.user?.id
  });

  recordOperation('stock_get_by_product', 'start');

  try {
    const options = {
      includeZero: includeZero === 'true',
      minQuantity: minQuantity ? parseInt(minQuantity) : undefined
    };

    // Convert productId to integer
    const productIdInt = parseInt(productId);
    if (isNaN(productIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
        error: 'VALIDATION_ERROR'
      });
    }

    const stockData = await StockService.getStockByProduct(productIdInt, options, req.user);

    recordOperation('stock_get_by_product', 'success');

    logger.info('Stock retrieved by product successfully', {
      productId,
      storeCount: stockData.length,
      totalQuantity: stockData.reduce((sum, stock) => sum + stock.quantity, 0)
    });

    res.json({
      success: true,
      data: stockData
    });
  } catch (error) {
    recordOperation('stock_get_by_product', 'error');
    throw error;
  }
});

/**
 * Get Stock by Store Controller
 * 
 * Retrieves all stock information for a specific store
 */
export const getByStore = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const { page = 1, limit = 50, category, lowStock, minQuantity } = req.query;

  // Input validation
  if (!storeId || isNaN(storeId)) {
    throw new ValidationError('Valid store ID is required');
  }

  logger.info('Retrieving stock by store', {
    storeId,
    page,
    limit,
    category,
    lowStock,
    userId: req.user?.id
  });

  recordOperation('stock_get_by_store', 'start');

  try {
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      lowStock: lowStock === 'true',
      minQuantity: minQuantity ? parseInt(minQuantity) : undefined
    };

    const result = await StockService.getStockByStore(storeId, options, req.user);

    recordOperation('stock_get_by_store', 'success');

    logger.info('Stock retrieved by store successfully', {
      storeId,
      productCount: result.products?.length || 0,
      totalProducts: result.total
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    recordOperation('stock_get_by_store', 'error');
    throw error;
  }
});

/**
 * Update Stock Controller
 * 
 * Updates stock quantity for a specific product in a store
 */
export const updateStock = asyncHandler(async (req, res) => {
  const { storeId, productId, quantity, operation, reason, notes } = req.body;

  // Input validation and conversion
  const storeIdInt = parseInt(storeId);
  if (!storeId || isNaN(storeIdInt)) {
    throw new ValidationError('Valid store ID is required');
  }

  const productIdInt = parseInt(productId);
  if (!productId || isNaN(productIdInt)) {
    throw new ValidationError('Valid product ID is required');
  }

  if (quantity === undefined || isNaN(quantity)) {
    throw new ValidationError('Valid quantity is required');
  }

  if (!operation || !['set', 'add', 'subtract'].includes(operation)) {
    throw new ValidationError('Operation must be one of: set, add, subtract');
  }

  logger.info('Updating stock', {
    storeId: storeIdInt,
    productId: productIdInt,
    quantity,
    operation,
    reason,
    userId: req.user?.id
  });

  recordOperation('stock_update', 'start');

  try {
    // Map operation to the type expected by the service
    let type, serviceQuantity;
    if (operation === 'set') {
      type = 'set';
      serviceQuantity = parseInt(quantity);
    } else if (operation === 'add') {
      type = 'adjustment';
      serviceQuantity = parseInt(quantity);
    } else if (operation === 'subtract') {
      type = 'adjustment';
      serviceQuantity = -parseInt(quantity); // Negative for subtraction
    }

    const updateData = {
      productId: productIdInt,
      storeId: storeIdInt,
      quantity: serviceQuantity,
      type,
      reason,
      notes,
      userId: req.user?.id
    };

    const stockUpdate = await StockService.updateStock(updateData);

    recordOperation('stock_update', 'success');

    logger.info('Stock updated successfully', {
      storeId: storeIdInt,
      productId: productIdInt,
      previousQuantity: stockUpdate.previousQuantity,
      newQuantity: stockUpdate.newQuantity,
      operation
    });

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: stockUpdate
    });
  } catch (error) {
    recordOperation('stock_update', 'error');
    throw error;
  }
});

/**
 * Bulk Update Stock Controller
 * 
 * Updates stock quantities for multiple products in a store
 */
export const bulkUpdateStock = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const { updates, operation = 'set', reason } = req.body;

  // Input validation
  if (!storeId || isNaN(storeId)) {
    throw new ValidationError('Valid store ID is required');
  }

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    throw new ValidationError('Updates array is required and must not be empty');
  }

  // Validate each update
  for (const update of updates) {
    if (!update.productId || isNaN(update.productId)) {
      throw new ValidationError('Each update must have a valid product ID');
    }
    if (update.quantity === undefined || isNaN(update.quantity)) {
      throw new ValidationError('Each update must have a valid quantity');
    }
  }

  if (!['set', 'add', 'subtract'].includes(operation)) {
    throw new ValidationError('Operation must be one of: set, add, subtract');
  }

  logger.info('Bulk updating stock', {
    storeId,
    updateCount: updates.length,
    operation,
    reason,
    userId: req.user?.id
  });

  recordOperation('stock_bulk_update', 'start');

  try {
    const bulkData = {
      updates: updates.map(update => ({
        productId: parseInt(update.productId),
        quantity: parseInt(update.quantity),
        reason: update.reason || reason,
        notes: update.notes
      })),
      operation,
      reason,
      userId: req.user?.id
    };

    const result = await StockService.bulkUpdateStock(storeId, bulkData, req.user);

    recordOperation('stock_bulk_update', 'success');

    logger.info('Bulk stock update completed', {
      storeId,
      successCount: result.successful?.length || 0,
      errorCount: result.errors?.length || 0,
      operation
    });

    res.json({
      success: true,
      message: 'Bulk stock update completed',
      data: result
    });
  } catch (error) {
    recordOperation('stock_bulk_update', 'error');
    throw error;
  }
});

/**
 * Transfer Stock Controller
 * 
 * Transfers stock between two stores
 */
export const transferStock = asyncHandler(async (req, res) => {
  const { fromStoreId, toStoreId, productId, quantity, reason, notes } = req.body;

  // Input validation
  if (!fromStoreId || isNaN(fromStoreId)) {
    throw new ValidationError('Valid source store ID is required');
  }

  if (!toStoreId || isNaN(toStoreId)) {
    throw new ValidationError('Valid destination store ID is required');
  }

  if (!productId || isNaN(productId)) {
    throw new ValidationError('Valid product ID is required');
  }

  if (!quantity || isNaN(quantity) || quantity <= 0) {
    throw new ValidationError('Valid positive quantity is required');
  }

  if (fromStoreId === toStoreId) {
    throw new ValidationError('Source and destination stores must be different');
  }

  logger.info('Transferring stock between stores', {
    fromStoreId,
    toStoreId,
    productId,
    quantity,
    reason,
    userId: req.user?.id
  });

  recordOperation('stock_transfer', 'start');

  try {
    const transferData = {
      fromStoreId: parseInt(fromStoreId),
      toStoreId: parseInt(toStoreId),
      productId: parseInt(productId),
      quantity: parseInt(quantity),
      reason,
      notes,
      userId: req.user?.id
    };

    const transfer = await StockService.transferStock(transferData, req.user);

    recordOperation('stock_transfer', 'success');

    logger.info('Stock transfer completed successfully', {
      transferId: transfer.id,
      fromStoreId,
      toStoreId,
      productId,
      quantity
    });

    res.json({
      success: true,
      message: 'Stock transfer completed successfully',
      data: transfer
    });
  } catch (error) {
    recordOperation('stock_transfer', 'error');
    throw error;
  }
});

/**
 * Get Stock Summary Controller
 * 
 * Retrieves stock summary and analytics
 */
export const getStockSummary = asyncHandler(async (req, res) => {
  const { storeId, period, category, lowStockThreshold } = req.query;

  logger.info('Retrieving stock summary', {
    storeId,
    period,
    category,
    lowStockThreshold,
    userId: req.user?.id
  });

  recordOperation('stock_summary', 'start');

  try {
    const options = {
      storeId: storeId ? parseInt(storeId) : undefined,
      period,
      category,
      lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : undefined
    };

    const summary = await StockService.getStockSummary(options, req.user);

    recordOperation('stock_summary', 'success');

    logger.info('Stock summary retrieved successfully', {
      storeId,
      totalProducts: summary.totalProducts,
      lowStockItems: summary.lowStockItems?.length || 0,
      totalValue: summary.totalValue
    });

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    recordOperation('stock_summary', 'error');
    throw error;
  }
});

/**
 * Verify Stock Level Controller
 * 
 * Verifies the current stock level for a specific product in a specific store.
 * Useful for debugging and verifying stock levels after sales.
 */
export const verifyStockLevel = asyncHandler(async (req, res) => {
  const { productId, storeId } = req.params;

  // Input validation
  if (!productId || isNaN(productId)) {
    throw new ValidationError('Valid product ID is required');
  }

  if (!storeId || isNaN(storeId)) {
    throw new ValidationError('Valid store ID is required');
  }

  logger.info('Verifying stock level', {
    productId: parseInt(productId),
    storeId: parseInt(storeId)
  });

  try {
    const stockInfo = await StockService.verifyStockLevel(
      parseInt(productId),
      parseInt(storeId)
    );

    recordOperation('verify_stock_level', 'success');

    logger.info('Stock level verified successfully', {
      productId: parseInt(productId),
      storeId: parseInt(storeId),
      currentStock: stockInfo.currentStock,
      exists: stockInfo.exists
    });

    res.json({
      success: true,
      data: stockInfo
    });
  } catch (error) {
    recordOperation('verify_stock_level', 'error');
    throw error;
  }
});
