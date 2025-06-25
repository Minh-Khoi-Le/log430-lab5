/**
 * Store Routes
 * 
 * 
 * Base path: /api/v1/stores
 * 
 * These routes are used by:
 * - Store management interfaces to manage store information
 * - Inventory management interfaces to view and manage store stock
 */

import express from 'express';
import * as controller from '../controllers/store.controller.js';
import { cacheMiddleware } from '../middleware/cache.js';
import invalidateCache from '../utils/cacheInvalidation.js';

const router = express.Router();

/**
 * GET /api/v1/stores
 * 
 * List all stores
 * 
 * Used by:
 * - Admin Dashboard to view all stores
 */
router.get('/', cacheMiddleware(300), controller.list);

/**
 * GET /api/v1/stores/:id
 * 
 * Get detailed information about a specific store
 * 
 * Path parameters:
 * - id: Store ID
 * 
 * Used by:
 * - Store detail pages
 * - Store management interfaces
 */
router.get('/:id', cacheMiddleware(300), controller.get);

/**
 * POST /api/v1/stores
 * 
 * Create a new store
 * 
 * Request body:
 * - name: Store name
 * - address: Store address (optional)
 * 
 * Used by:
 * - Admin dashboard for store management
 */
router.post('/', async (req, res, next) => {
  try {
    await controller.create(req, res, next);
    await invalidateCache.stores();
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/stores/:id
 * 
 * Update an existing store (To be implemented)
 * 
 * Path parameters:
 * - id: Store ID
 * 
 * Request body:
 * - name: Store name (optional)
 * - address: Store address (optional)
 * 
 * Used by:
 * - Admin dashboard for store management
 * - Parent company (maisonmere) to update store information
 */
router.put('/:id', async (req, res, next) => {
  try {
    await controller.update(req, res, next);
    await invalidateCache.stores();
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/stores/:id
 * 
 * Delete a store (To be implemented)
 * 
 * Path parameters:
 * - id: Store ID
 * 
 * Used by:
 * - Admin interfaces for store management
 * - Parent company (maisonmere) to remove closed stores
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await controller.remove(req, res, next);
    await invalidateCache.stores();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/stores/:storeId/stock
 * 
 * Get current stock levels for a specific store
 * 
 * Path parameters:
 * - storeId: Store ID
 * 
 * Used by:
 * - Store managers to view current inventory
 * - Inventory management interfaces
 * - Sales interfaces to check product availability
 */
router.get('/:storeId/stock', cacheMiddleware(300), controller.stock);


export default router;
