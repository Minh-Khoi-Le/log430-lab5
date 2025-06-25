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
import { body, param, query } from 'express-validator';
import * as controller from '../controllers/product.controller.js';
import { auth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { recordProductOperation } from '../middleware/metrics.js';

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
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('size').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sort').optional().isString().matches(/^[+-]?(name|price|id)$/),
  query('search').optional().isString().trim(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  validateRequest,
  cacheMiddleware(300), // Cache for 5 minutes
  (req, res, next) => {
    // Record metrics for product catalog access
    recordProductOperation(null, 'list');
    next();
  },
  controller.list
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
  param('id').isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
  validateRequest,
  cacheMiddleware(300), // Cache for 5 minutes
  (req, res, next) => {
    // Record metrics for individual product access
    recordProductOperation(req.params.id, 'view');
    next();
  },
  controller.get
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
  auth,
  // Input validation for product data
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
    .withMessage('Product description must be a string'),
  validateRequest,
  (req, res, next) => {
    // Record metrics for product creation
    recordProductOperation(null, 'create');
    next();
  },
  controller.create
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
  auth,
  // Validate product ID parameter
  param('id').isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
  // Input validation for update data (all optional)
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
    .withMessage('Product description must be a string'),
  validateRequest,
  (req, res, next) => {
    // Record metrics for product update
    recordProductOperation(req.params.id, 'update');
    next();
  },
  controller.update
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
  auth,
  // Validate product ID parameter
  param('id').isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
  validateRequest,
  (req, res, next) => {
    // Record metrics for product deletion
    recordProductOperation(req.params.id, 'delete');
    next();
  },
  controller.remove
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
  param('id').isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
  validateRequest,
  cacheMiddleware(60), // Cache for 1 minute (stock data changes frequently)
  (req, res, next) => {
    recordProductOperation(req.params.id, 'availability_check');
    next();
  },
  controller.getAvailability
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
  query('q').optional().isString().trim(),
  query('category').optional().isString().trim(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('inStock').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('size').optional().isInt({ min: 1, max: 100 }).toInt(),
  validateRequest,
  cacheMiddleware(180), // Cache for 3 minutes
  (req, res, next) => {
    recordProductOperation(null, 'search');
    next();
  },
  controller.search
);

export default router;
