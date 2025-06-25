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
 * - Request validation middleware
 * - Authentication middleware (where required)
 * - Caching middleware (for read operations)
 * - Error handling
 * 
 * @author Store Service Team
 * @version 1.0.0
 */

import express from 'express';
import StoreController from '../controllers/store.controller.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate } from '../middleware/auth.js';
import { cache } from '../middleware/cache.js';

const router = express.Router();

/**
 * Store List Route
 * GET /api/stores
 * 
 * Retrieves paginated list of stores with optional search filtering.
 * Cached for 5 minutes to improve performance.
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - search: Search term for filtering stores
 * 
 * Response: 200 OK with stores array and pagination info
 */
router.get('/', 
  cache(300), // Cache for 5 minutes
  StoreController.list
);

/**
 * Store Details Route
 * GET /api/stores/:id
 * 
 * Retrieves detailed information for a specific store.
 * Cached for 10 minutes to reduce database load.
 * 
 * Parameters:
 * - id: Store ID (integer)
 * 
 * Response: 200 OK with store details or 404 if not found
 */
router.get('/:id', 
  validateRequest({
    type: 'params',
    schema: {
      id: { type: 'string', pattern: '^\\d+$' }
    }
  }),
  cache(600), // Cache for 10 minutes
  StoreController.get
);

/**
 * Store Statistics Route
 * GET /api/stores/:id/stats
 * 
 * Retrieves operational statistics for a specific store.
 * Requires authentication for accessing sensitive business data.
 * Cached for 15 minutes due to complex calculations.
 * 
 * Parameters:
 * - id: Store ID (integer)
 * 
 * Response: 200 OK with store statistics or 404 if not found
 */
router.get('/:id/stats',
  authenticate,
  validateRequest({
    type: 'params',
    schema: {
      id: { type: 'string', pattern: '^\\d+$' }
    }
  }),
  cache(900), // Cache for 15 minutes
  StoreController.getStats
);

/**
 * Store Creation Route
 * POST /api/stores
 * 
 * Creates a new store with provided data.
 * Requires authentication and validates all required fields.
 * 
 * Body Requirements:
 * - name: Store name (3-100 characters)
 * - address: Store address (5-200 characters)
 * - city: Store city (2-50 characters)
 * - phone: Contact phone (optional, valid phone format)
 * - email: Contact email (optional, valid email format)
 * 
 * Response: 201 Created with new store data
 */
router.post('/',
  authenticate,
  validateRequest({
    type: 'body',
    schema: {
      name: { 
        type: 'string', 
        minLength: 3, 
        maxLength: 100,
        required: true 
      },
      address: { 
        type: 'string', 
        minLength: 5, 
        maxLength: 200,
        required: true 
      },
      city: { 
        type: 'string', 
        minLength: 2, 
        maxLength: 50,
        required: true 
      },
      phone: { 
        type: 'string', 
        pattern: '^[+]?[\\d\\s\\-\\(\\)]+$',
        maxLength: 20,
        required: false 
      },
      email: { 
        type: 'string', 
        format: 'email',
        maxLength: 100,
        required: false 
      }
    }
  }),
  StoreController.create
);

/**
 * Store Update Route
 * PUT /api/stores/:id
 * 
 * Updates an existing store with provided data.
 * Requires authentication and validates update fields.
 * Supports partial updates.
 * 
 * Parameters:
 * - id: Store ID (integer)
 * 
 * Body (all optional for partial update):
 * - name: Store name (3-100 characters)
 * - address: Store address (5-200 characters)
 * - city: Store city (2-50 characters)
 * - phone: Contact phone (valid phone format)
 * - email: Contact email (valid email format)
 * 
 * Response: 200 OK with updated store data or 404 if not found
 */
router.put('/:id',
  authenticate,
  validateRequest({
    type: 'params',
    schema: {
      id: { type: 'string', pattern: '^\\d+$' }
    }
  }),
  validateRequest({
    type: 'body',
    schema: {
      name: { 
        type: 'string', 
        minLength: 3, 
        maxLength: 100,
        required: false 
      },
      address: { 
        type: 'string', 
        minLength: 5, 
        maxLength: 200,
        required: false 
      },
      city: { 
        type: 'string', 
        minLength: 2, 
        maxLength: 50,
        required: false 
      },
      phone: { 
        type: 'string', 
        pattern: '^[+]?[\\d\\s\\-\\(\\)]+$',
        maxLength: 20,
        required: false 
      },
      email: { 
        type: 'string', 
        format: 'email',
        maxLength: 100,
        required: false 
      }
    }
  }),
  StoreController.update
);

/**
 * Store Deletion Route
 * DELETE /api/stores/:id
 * 
 * Deletes a store by ID.
 * Requires authentication and checks for dependencies.
 * 
 * Parameters:
 * - id: Store ID (integer)
 * 
 * Response: 200 OK with success message or 404 if not found
 * Error: 400 Bad Request if store has dependencies
 */
router.delete('/:id',
  authenticate,
  validateRequest({
    type: 'params',
    schema: {
      id: { type: 'string', pattern: '^\\d+$' }
    }
  }),
  StoreController.remove
);

export default router;
