/**
 * Product Routes
 * 
 * Base path: /api/v1/products
 * 
 * These routes are used by:
 * - Admin product list page
 * - Admin product creation form
 * - Admin product edit form
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import * as controller from '../controllers/product.controller.js';
import { auth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { cacheMiddleware } from '../middleware/cache.js';
import invalidateCache from '../utils/cacheInvalidation.js';

const router = express.Router();

/**
 * GET /api/v1/products
 * 
 * List all products with optional pagination and sorting
 *
 * 
 * Used by:
 * - Store interfaces to display product catalog
 * - Admin interfaces to manage products
 */
router.get('/',
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('size').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sort').optional().isString(),
  validateRequest,
  cacheMiddleware(300), // Cache for 5 minutes
  controller.list
);

/**
 * GET /api/v1/products/:id
 * 
 * Get detailed information about a specific product
 * 
 * Used by:
 * - Product detail pages
 * - Sales interfaces when adding products to sales
 * - Inventory management interfaces
 */
router.get('/:id',
  param('id').isInt({ min: 1 }),
  validateRequest,
  cacheMiddleware(300), // Cache for 5 minutes
  controller.get
);

/**
 * POST /api/v1/products
 * 
 * Create a new product
 * 
 * Used by:
 * - Admin interfaces for product catalog management
 */
router.post('/',
  auth,
  body('name').isString().trim().notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('description').optional().isString().trim(),
  validateRequest,
  async (req, res, next) => {
    try {
      await controller.create(req, res, next);
      // Invalidate relevant caches after successful creation
      await invalidateCache.products();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/products/:id
 * 
 * Update an existing product
 * 
 * Used by:
 * - Admin interfaces for product catalog management
 */
router.put('/:id',
  auth,
  param('id').isInt({ min: 1 }),
  body('name').optional().isString().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  body('description').optional().isString().trim(),
  validateRequest,
  async (req, res, next) => {
    try {
      await controller.update(req, res, next);
      // Invalidate relevant caches after successful update
      await invalidateCache.products();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/products/:id
 * 
 * Delete a product
 * Used by:
 * - Admin interfaces for product catalog management
 */
router.delete('/:id',
  auth,
  param('id').isInt({ min: 1 }),
  validateRequest,
  async (req, res, next) => {
    try {
      await controller.remove(req, res, next);
      // Invalidate relevant caches after successful deletion
      await invalidateCache.products();
    } catch (error) {
      next(error);
    }
  }
);

export default router; 