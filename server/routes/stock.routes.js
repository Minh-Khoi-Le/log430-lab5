/**
 * Stock Routes
 * 
 * Base path: /api/v1/stock
 * 
 * These routes handle stock-related operations including:
 * - Retrieving stock information by store or product
 * - Updating stock quantities
 */

import express from 'express';
import * as controller from '../controllers/stock.controller.js';
import { auth } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
import invalidateCache from '../utils/cacheInvalidation.js';

const router = express.Router();

/**
 * GET /api/v1/stock/product/:productId
 * 
 * Get stock information for a specific product across all stores.
 * 
 */
router.get('/product/:productId', cacheMiddleware(300), controller.getByProduct);

/**
 * GET /api/v1/stock/store/:storeId
 * 
 * Get stock information for all products in a specific store.
 * 
 */
router.get('/store/:storeId', cacheMiddleware(300), controller.getByStore);

/**
 * PUT /api/v1/stock/product/:productId
 * 
 * Update stock quantity for a specific product in a specific store.
 * Requires authentication with gestionnaire role.
 */
router.put('/product/:productId', auth, async (req, res, next) => {
  try {
    await controller.updateStock(req, res, next);
    // Invalidate both product and stock related caches
    await invalidateCache.stock();
  } catch (error) {
    next(error);
  }
});

export default router; 