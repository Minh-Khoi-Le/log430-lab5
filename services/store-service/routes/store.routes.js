/**
 * Store Service Routes
 * 
 * This module defines all HTTP routes for store management operations.
 * Routes are organized to provide RESTful API endpoints with proper middleware integration.
 * 
 * Route Structure:
 * - GET /api/stores - List all stores with pagination
 * - GET /api/stores/:id - Get specific store details
 * - POST /api/stores - Create new store
 * - PUT /api/stores/:id - Update store
 * - DELETE /api/stores/:id - Delete store
 * - GET /api/stores/:id/stats - Get store statistics
 * 
 * All routes include:
 * - Authentication middleware (where required)
 * - Input validation handled by controllers
 * - Error handling
 * 
 * @author Store Service Team
 * @version 1.0.0
 */

import express from 'express';
import StoreController from '../controllers/store.controller.js';

// Import shared middleware
import { 
  authenticate,
  authorize,
  validateId
} from '@log430/shared';

const router = express.Router();

/**
 * Store Management Routes
 */

// Get all stores with pagination and filtering
router.get('/',
  StoreController.getAllStores
);

// Get store by ID
router.get('/:id',
  validateId('id'),
  StoreController.getStoreById
);

// Create new store (admin only)
router.post('/',
  authenticate,
  authorize(['admin']),
  StoreController.createStore
);

// Update store (admin only)
router.put('/:id',
  authenticate,
  authorize(['admin']),
  validateId('id'),
  StoreController.updateStore
);

// Delete store (admin only)
router.delete('/:id',
  authenticate,
  authorize(['admin']),
  validateId('id'),
  StoreController.deleteStore
);

// Get store statistics
router.get('/:id/stats',
  authenticate,
  validateId('id'),
  StoreController.getStoreStats
);

// Get store inventory summary
router.get('/:id/inventory',
  authenticate,
  validateId('id'),
  StoreController.getStoreInventory
);

// Get store sales summary
router.get('/:id/sales',
  authenticate,
  validateId('id'),
  StoreController.getStoreSales
);

export default router;
