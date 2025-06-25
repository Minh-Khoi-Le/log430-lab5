/**
 * Refund Routes
 * 
 * Base path: /api/v1/refunds
 * 
 * These routes are used for:
 * - Processing refunds for sales
 * - Viewing refund history
 * - Generating refund reports
 */

import express from 'express';
import * as controller from '../controllers/refund.controller.js';

const router = express.Router();

/**
 * GET /api/v1/refunds
 * 
 * List all refunds with client, sale, and store information
 * 
 * Used by:
 * - Admin dashboards
 */
router.get('/', controller.list);

/**
 * POST /api/v1/refunds
 * 
 * Create a new refund for a sale
 * 
 * Request body:
 * - saleId: ID of the sale to refund
 * - reason: Optional reason for the refund
 * - items: Optional specific items to refund (if not provided, all items are refunded)
 * - userId: Optional user ID (if different from the sale's user)
 * - magasinId: Optional store ID (if different from the sale's store)
 * 
 * The endpoint handles:
 * - Sale status updates
 * - Stock quantity updates
 * - Refund record creation
 * 
 * Used by:
 * - Client history page
 * - Admin refund processing
 */
router.post('/', controller.create);

/**
 * POST /api/v1/refunds/history
 * 
 * Get refund history for the current user
 * 
 * Request body:
 * - userId: User ID
 * 
 * Used by:
 * - Client refund history page
 */
router.post('/history', controller.getByUser);

/**
 * GET /api/v1/refunds/user/:userId
 * 
 * Get all refunds for a specific user
 * 
 * Path parameters:
 * - userId: User ID
 * 
 * Used by:
 * - Admin dashboard
 */
router.get('/user/:userId', controller.getByUser);

/**
 * GET /api/v1/refunds/sale/:saleId
 * 
 * Get refunds for a specific sale
 * 
 * Path parameters:
 * - saleId: Sale ID
 * 
 * Used by:
 * - Sale detail pages
 * - Admin dashboard
 */
router.get('/sale/:saleId', controller.getBySale);

/**
 * GET /api/v1/refunds/store/:storeId
 * 
 * Get refunds processed at a specific store
 * 
 * Path parameters:
 * - storeId: Store ID
 * 
 * Query parameters:
 * - limit: Optional limit on number of refunds to return
 * 
 * Used by:
 * - Store detail pages
 * - Admin dashboard
 */
router.get('/store/:storeId', controller.byStore);

export default router; 