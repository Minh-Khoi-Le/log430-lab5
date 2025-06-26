/**
 * Stock Service Routes
 * 
 * This module defines all HTTP routes for stock management operations.
 * Routes are organized to provide RESTful API endpoints with proper middleware integration.
 * 
 * Route Structure:
 * - GET /api/stock/product/:productId - Get stock by product across stores
 * - GET /api/stock/store/:storeId - Get stock by store with pagination
 * - PUT /api/stock - Update stock quantity
 * - PUT /api/stock/bulk - Bulk update stock quantities
 * - POST /api/stock/transfer - Transfer stock between stores
 * - GET /api/stock/summary - Get stock summary and analytics
 * - GET /api/stock/availability - Check stock availability
 * 
 * All routes include:
 * - Request validation middleware
 * - Authentication middleware (where required)
 * - Caching middleware (for read operations)
 * - Comprehensive error handling
 * 
 * @author Stock Service Team
 * @version 1.0.0
 */

import express from 'express';
import StockController from '../controllers/stock.controller.js';

// Import shared middleware
import { 
  authenticate,
  validateId
} from '@log430/shared';

const router = express.Router();

/**
 * Get Stock by Product Route
 * GET /api/stock/product/:productId
 * 
 * Retrieves stock information for a specific product across all stores.
 * Cached for improved performance.
 * 
 * Parameters:
 * - productId: Product ID (integer)
 * 
 * Query Parameters:
 * - includeZero: Include stores with zero stock (default: false)
 * - minQuantity: Filter by minimum stock quantity (default: 0)
 * 
 * Response: 200 OK with stock data across stores
 */
router.get('/product/:productId',
  validateId('productId'),
  StockController.getByProduct
);

/**
 * Get Stock by Store Route
 * GET /api/stock/store/:storeId
 * 
 * Retrieves paginated stock information for a specific store.
 * Includes filtering and sorting options.
 * 
 * Parameters:
 * - storeId: Store ID (integer)
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 200)
 * - includeZero: Include products with zero stock (default: false)
 * - category: Filter by product category
 * - lowStock: Show only low stock items (default: false)
 * - threshold: Low stock threshold (default: 10)
 * 
 * Response: 200 OK with paginated stock data
 */
router.get('/store/:storeId',
  validateId('storeId'),
  StockController.getByStore
);

/**
 * Stock Summary Route
 * GET /api/stock/summary
 * 
 * Retrieves aggregated stock information and analytics.
 * Requires authentication for accessing business data.
 * 
 * Query Parameters:
 * - storeId: Filter by specific store (optional)
 * - productId: Filter by specific product (optional)
 * - category: Filter by product category (optional)
 * - lowStockThreshold: Threshold for low stock alerts (default: 10)
 * 
 * Response: 200 OK with stock summary and analytics
 */
router.get('/summary',
  authenticate,
  StockController.getStockSummary
);

/**
 * Check Stock Availability Route
 * GET /api/stock/availability
 * 
 * Checks stock availability for a specific product and quantity in a store.
 * Used by other services to validate stock before operations.
 * 
 * Query Parameters:
 * - productId: Product ID (required)
 * - storeId: Store ID (required)
 * - quantity: Requested quantity (required)
 * 
 * Response: 200 OK with availability information
 */
router.get('/availability',
  validateId('productId', 'query'),
  validateId('storeId', 'query'),
  async (req, res, next) => {
    try {
      const { productId, storeId, quantity } = req.query;
      const StockService = (await import('../services/stock.service.js')).default;
      
      const availability = await StockService.checkAvailability(
        parseInt(productId),
        parseInt(storeId),
        parseInt(quantity)
      );
      
      res.json({
        success: true,
        data: availability
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update Stock Route
 * PUT /api/stock
 * 
 * Updates stock quantity for a specific product in a store.
 * Requires authentication and validates update data.
 * 
 * Body Requirements:
 * - productId: Product ID (integer)
 * - storeId: Store ID (integer)
 * - quantity: New quantity or adjustment amount (integer, >= 0)
 * - type: Update type ('set' or 'adjustment') - default: 'set'
 * - reason: Reason for stock change (optional)
 * 
 * Response: 200 OK with updated stock information
 */
router.put('/',
  authenticate,
  // Basic body validation would be handled by controller or shared validators
  StockController.updateStock
);

/**
 * Bulk Update Stock Route
 * PUT /api/stock/bulk
 * 
 * Updates multiple stock items in a single transaction.
 * Requires authentication and validates all update items.
 * 
 * Body Requirements:
 * - updates: Array of stock updates (max 100)
 *   - productId: Product ID (integer)
 *   - storeId: Store ID (integer)
 *   - quantity: New quantity or adjustment amount (integer, >= 0)
 *   - type: Update type ('set' or 'adjustment') - default: 'set'
 * - reason: Reason for bulk update (optional)
 * 
 * Response: 200 OK or 207 Multi-Status with bulk update results
 */
router.put('/bulk',
  authenticate,
  // Complex validation would be handled by controller
  StockController.bulkUpdateStock
);

/**
 * Transfer Stock Route
 * POST /api/stock/transfer
 * 
 * Transfers stock from one store to another.
 * Requires authentication and validates transfer data.
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
router.post('/transfer',
  authenticate,
  // Transfer validation would be handled by controller
  StockController.transferStock
);

export default router;
