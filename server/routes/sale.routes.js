/**
 * Sale Routes
 * 
 * 
 * Base path: /api/v1/sales
 * 
 * These routes are used by:
 * - Point of sale (POS) interfaces to create new sales
 * - Reporting page in Dashboard
 */

import express from 'express';
import * as controller from '../controllers/sale.controller.js';

const router = express.Router();

/**
 * GET /api/v1/sales
 * 
 * List all sales with client and store information
 * 
 * Used by:
 * - Admin dashboards
 */
router.get('/', controller.list);

/**
 * POST /api/v1/sales
 * 
 * Create a new sale transaction
 * 
 * Request body:
 * - storeId: Store ID where the sale occurred
 * - clientId: Client ID (optional if clientName is provided)
 * - clientName: Client name (optional if clientId is provided)
 * - lines: Array of sale line items with product ID, quantity, and unit price
 * - cart: Alternative format for sale items (backwards compatibility)
 * 
 * The endpoint handles:
 * - Client creation if only name is provided
 * - Stock availability verification
 * - Stock quantity updates
 * - Transaction consistency
 * 
 * Used by:
 * - Point of sale (POS) interfaces
 * - Online store checkout process
 */
router.post('/', controller.create);

/**
 * POST /api/v1/sales/refund
 * 
 * Refund a sale transaction
 * 
 * Request body:
 * - saleId: ID of the sale to refund
 * 
 * The endpoint handles:
 * - Returning products to stock
 * - Removing the sale record
 * - Transaction consistency
 * 
 * Used by:
 * - Client history page
 */
router.post('/refund', controller.refund);

/**
 * GET /api/v1/sales/history
 * 
 * Get all sales for the current user based on the user ID in the request body
 * 
 * Request body:
 * - userId: User ID
 * 
 * Used by:
 * - Client history page
 */
router.post('/history', controller.byClient);

/**
 * GET /api/v1/sales/client/:clientId
 * 
 * Get all sales for a specific client
 * 
 * Path parameters:
 * - clientId: Client ID
 * 
 * Used by:
 * 
 * - Admin dashboard
 */
router.get('/client/:clientId', controller.byClient);

/**
 * GET /api/v1/sales/store/:storeId
 * 
 * Get sales for a specific store
 * 
 * Path parameters:
 * - storeId: Store ID
 * 
 * Query parameters:
 * - limit: Optional limit on number of sales to return
 * 
 * Used by:
 * - Store detail pages
 * - Admin dashboard
 */
router.get('/store/:storeId', controller.byStore);

export default router;
