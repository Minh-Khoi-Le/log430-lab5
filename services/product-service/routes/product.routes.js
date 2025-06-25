/**
 * Product Routes for Product Microservice
 * 
 * Base path: /products (note: no /api/v1 prefix as this is handled by API Gateway)
 * 
 * This module defines all HTTP endpoints for product management operations:
 * - Product catalog browsing and search
 * - Individual product details retrieval
 * - Product CRUD operations (admin only)
 * - Product inventory integration points
 * 
 * Route Security:
 * - Public routes: GET operations (product listing, details)
 * - Protected routes: POST, PUT, DELETE operations (require authentication)
 * 
 * Route Performance:
 * - Caching implemented for frequently accessed data
 * - Pagination for large result sets
 * - Metrics collection for monitoring
 */

import express from 'express';
import { body, query } from 'express-validator';
import * as controller from '../controllers/product.controller.js';
import {
  authenticate,
  authorize,
  validate,
  validateId,
  validatePagination,
  cacheMiddleware,
  recordOperation,
  asyncHandler
} from '@log430/shared';

const router = express.Router();

/**
 * GET /products
 * 
 * Retrieve product catalog with optional pagination, sorting, and filtering
 * 
 * Query Parameters:
 * - page: Page number for pagination (default: 1)
 * - size: Number of products per page (default: 10, max: 100)
 * - sort: Sort field (name, price, id) with optional direction (+/-)
 * - search: Search term for product names and descriptions
 * - minPrice: Minimum price filter
 * - maxPrice: Maximum price filter
 * 
 * Public endpoint - no authentication required
 * Cached for 5 minutes to improve performance
 * 
 * Used by:
 * - E-commerce frontend product listings
 * - Admin product management interfaces
 * - Other microservices requiring product information
 */
router.get('/',
  // Input validation for query parameters
  validate([
    ...validatePagination(),
    query('sort').optional().isString().matches(/^[+-]?(name|price|id)$/),
    query('search').optional().isString().trim(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 })
  ]),
  cacheMiddleware(300), // Cache for 5 minutes
  asyncHandler(async (req, res, next) => {
    // Record metrics for product catalog access
    recordOperation('product_list', 'success');
    await controller.list(req, res, next);
  })
);

/**
 * GET /products/:id
 * 
 * Retrieve detailed information about a specific product
 * 
 * Path Parameters:
 * - id: Product ID (must be positive integer)
 * 
 * Public endpoint - no authentication required
 * Cached for 5 minutes to improve performance
 * 
 * Returns:
 * - Product details including name, price, description
 * - Associated stock information across stores
 * - Product availability status
 * 
 * Used by:
 * - Product detail pages in frontend
 * - Sales service when creating sales
 * - Stock service for inventory management
 * - Cart service for product validation
 */
router.get('/:id',
  // Validate product ID parameter
  validate([
    ...validateId()
  ]),
  cacheMiddleware(300), // Cache for 5 minutes
  asyncHandler(async (req, res, next) => {
    // Record metrics for individual product access
    recordOperation('product_view', 'success');
    await controller.get(req, res, next);
  })
);

/**
 * POST /products
 * 
 * Create a new product in the catalog
 * 
 * Request Body:
 * - name: Product name (required, non-empty string)
 * - price: Product price (required, non-negative number)
 * - description: Product description (optional string)
 * 
 * Protected endpoint - requires authentication and admin role
 * Cache invalidation triggered after successful creation
 * 
 * Used by:
 * - Admin product management interfaces
 * - Bulk product import systems
 * - Third-party catalog management tools
 */
router.post('/',
  // Authentication required for product creation
  authenticate,
  authorize(['admin']),
  // Input validation for product data
  validate([
    body('name')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Product name is required and cannot be empty'),
    body('price')
      .isFloat({ min: 0 })
      .withMessage('Product price must be a non-negative number'),
    body('description')
      .optional()
      .isString()
      .trim()
      .withMessage('Product description must be a string')
  ]),
  asyncHandler(async (req, res, next) => {
    // Record metrics for product creation
    recordOperation('product_create', 'success');
    await controller.create(req, res, next);
  })
);

/**
 * PUT /products/:id
 * 
 * Update an existing product's information
 * 
 * Path Parameters:
 * - id: Product ID to update (must be positive integer)
 * 
 * Request Body (all fields optional):
 * - name: Updated product name
 * - price: Updated product price (must be non-negative)
 * - description: Updated product description
 * 
 * Protected endpoint - requires authentication and admin role
 * Cache invalidation triggered after successful update
 * 
 * Used by:
 * - Admin product management interfaces
 * - Price update systems
 * - Product information maintenance tools
 */
router.put('/:id',
  // Authentication required for product updates
  authenticate,
  authorize(['admin']),
  // Validate product ID parameter and update data
  validate([
    ...validateId(),
    body('name')
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Product name cannot be empty if provided'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Product price must be a non-negative number'),
    body('description')
      .optional()
      .isString()
      .trim()
      .withMessage('Product description must be a string')
  ]),
  asyncHandler(async (req, res, next) => {
    // Record metrics for product update
    recordOperation('product_update', 'success');
    await controller.update(req, res, next);
  })
);

/**
 * DELETE /products/:id
 * 
 * Remove a product from the catalog
 * 
 * Path Parameters:
 * - id: Product ID to delete (must be positive integer)
 * 
 * Protected endpoint - requires authentication and admin role
 * Cache invalidation triggered after successful deletion
 * 
 * Constraints:
 * - Cannot delete products that have existing stock
 * - Cannot delete products referenced in sales history
 * - Soft delete may be implemented for audit trail
 * 
 * Used by:
 * - Admin product management interfaces
 * - Product lifecycle management systems
 * - Catalog cleanup operations
 */
router.delete('/:id',
  // Authentication required for product deletion
  authenticate,
  authorize(['admin']),
  // Validate product ID parameter
  validate([
    ...validateId()
  ]),
  asyncHandler(async (req, res, next) => {
    // Record metrics for product deletion
    recordOperation('product_delete', 'success');
    await controller.remove(req, res, next);
  })
);

/**
 * GET /products/:id/availability
 * 
 * Check product availability across all stores
 * 
 * Path Parameters:
 * - id: Product ID (must be positive integer)
 * 
 * Public endpoint - no authentication required
 * Returns stock levels across all stores for the specified product
 * 
 * Used by:
 * - E-commerce frontend for stock display
 * - Sales service for availability checking
 * - Cart service for product validation
 */
router.get('/:id/availability',
  validate([
    ...validateId()
  ]),
  cacheMiddleware(60), // Cache for 1 minute (stock data changes frequently)
  asyncHandler(async (req, res, next) => {
    recordOperation('product_availability_check', 'success');
    await controller.getAvailability(req, res, next);
  })
);

/**
 * GET /products/search
 * 
 * Advanced product search with multiple criteria
 * 
 * Query Parameters:
 * - q: Search query string
 * - category: Product category filter
 * - minPrice: Minimum price filter
 * - maxPrice: Maximum price filter
 * - inStock: Filter for products with available stock
 * - page: Page number for pagination
 * - size: Results per page
 * 
 * Public endpoint with caching for performance
 * 
 * Used by:
 * - E-commerce search functionality
 * - Product discovery features
 * - Inventory management queries
 */
router.get('/search',
  validate([
    ...validatePagination(),
    query('q').optional().isString().trim(),
    query('category').optional().isString().trim(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('inStock').optional().isBoolean()
  ]),
  cacheMiddleware(180), // Cache for 3 minutes
  asyncHandler(async (req, res, next) => {
    recordOperation('product_search', 'success');
    await controller.search(req, res, next);
  })
);

export default router;
