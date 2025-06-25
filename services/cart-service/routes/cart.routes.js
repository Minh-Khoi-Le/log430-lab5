/**
 * Cart Routes
 * 
 * Defines all HTTP endpoints for shopping cart operations:
 * - GET /cart/:userId - Get user's cart
 * - POST /cart/:userId/items - Add item to cart
 * - PUT /cart/:userId/items/:productId - Update item quantity
 * - DELETE /cart/:userId/items/:productId - Remove item from cart
 * - DELETE /cart/:userId - Clear entire cart
 * - POST /cart/:userId/checkout - Prepare cart for checkout
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate } from '../middleware/auth.js';
import { cache } from '../middleware/cache.js';
import * as cartController from '../controllers/cart.controller.js';

const router = express.Router();

/**
 * Validation Rules
 * Define input validation for cart operations
 */

// User ID validation (UUID format)
const userIdValidation = param('userId')
  .isUUID(4)
  .withMessage('User ID must be a valid UUID');

// Product ID validation (UUID format)
const productIdValidation = param('productId')
  .isUUID(4)
  .withMessage('Product ID must be a valid UUID');

// Add item to cart validation
const addItemValidation = [
  body('productId')
    .isUUID(4)
    .withMessage('Product ID must be a valid UUID'),
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be a positive integer between 1 and 100'),
  body('storeId')
    .optional()
    .isUUID(4)
    .withMessage('Store ID must be a valid UUID if provided'),
  body('selectedVariant')
    .optional()
    .isObject()
    .withMessage('Selected variant must be an object if provided')
];

// Update quantity validation
const updateQuantityValidation = [
  body('quantity')
    .isInt({ min: 0, max: 100 })
    .withMessage('Quantity must be a non-negative integer between 0 and 100')
];

// Checkout validation
const checkoutValidation = [
  body('storeId')
    .isUUID(4)
    .withMessage('Store ID must be a valid UUID'),
  body('shippingAddress')
    .optional()
    .isObject()
    .withMessage('Shipping address must be an object if provided'),
  body('paymentMethod')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Payment method must be a string between 1 and 50 characters')
];

/**
 * Cart Documentation Endpoint
 * GET /docs - API documentation
 */
router.get('/docs', (req, res) => {
  res.json({
    service: 'Cart Service API',
    version: '1.0.0',
    description: 'Shopping cart management endpoints',
    baseUrl: '/api/v1/cart',
    endpoints: {
      'GET /:userId': {
        description: 'Get user\'s shopping cart',
        auth: 'required',
        parameters: {
          userId: 'UUID - User identifier'
        },
        query: {
          storeId: 'UUID (optional) - Filter by store'
        },
        responses: {
          200: 'Cart data with items',
          404: 'Cart not found',
          401: 'Unauthorized'
        }
      },
      'POST /:userId/items': {
        description: 'Add item to cart',
        auth: 'required',
        parameters: {
          userId: 'UUID - User identifier'
        },
        body: {
          productId: 'UUID - Product identifier',
          quantity: 'Integer (1-100) - Item quantity',
          storeId: 'UUID (optional) - Store identifier',
          selectedVariant: 'Object (optional) - Product variant'
        },
        responses: {
          201: 'Item added to cart',
          400: 'Invalid input',
          404: 'Product not found',
          409: 'Insufficient stock'
        }
      },
      'PUT /:userId/items/:productId': {
        description: 'Update item quantity in cart',
        auth: 'required',
        parameters: {
          userId: 'UUID - User identifier',
          productId: 'UUID - Product identifier'
        },
        body: {
          quantity: 'Integer (0-100) - New quantity (0 removes item)'
        },
        responses: {
          200: 'Item quantity updated',
          400: 'Invalid input',
          404: 'Item not found in cart'
        }
      },
      'DELETE /:userId/items/:productId': {
        description: 'Remove item from cart',
        auth: 'required',
        parameters: {
          userId: 'UUID - User identifier',
          productId: 'UUID - Product identifier'
        },
        responses: {
          200: 'Item removed from cart',
          404: 'Item not found in cart'
        }
      },
      'DELETE /:userId': {
        description: 'Clear entire cart',
        auth: 'required',
        parameters: {
          userId: 'UUID - User identifier'
        },
        responses: {
          200: 'Cart cleared',
          404: 'Cart not found'
        }
      },
      'POST /:userId/checkout': {
        description: 'Prepare cart for checkout',
        auth: 'required',
        parameters: {
          userId: 'UUID - User identifier'
        },
        body: {
          storeId: 'UUID - Store identifier for checkout',
          shippingAddress: 'Object (optional) - Delivery address',
          paymentMethod: 'String (optional) - Payment method'
        },
        responses: {
          200: 'Checkout data prepared',
          400: 'Invalid input or empty cart',
          409: 'Stock unavailable for some items'
        }
      }
    },
    authentication: {
      type: 'Bearer Token (JWT)',
      header: 'Authorization: Bearer <token>'
    },
    errors: {
      400: 'Bad Request - Invalid input parameters',
      401: 'Unauthorized - Authentication required',
      403: 'Forbidden - Insufficient permissions',
      404: 'Not Found - Resource not found',
      409: 'Conflict - Business logic conflict (e.g., insufficient stock)',
      500: 'Internal Server Error - Server-side error'
    }
  });
});

/**
 * Get User's Cart
 * GET /:userId
 * 
 * Retrieves the complete shopping cart for a user, including:
 * - All cart items with product details
 * - Quantity and pricing information
 * - Stock availability status
 * - Store-specific grouping (if storeId provided)
 */
router.get('/:userId', 
  authenticate,
  userIdValidation,
  query('storeId').optional().isUUID(4).withMessage('Store ID must be a valid UUID'),
  validateRequest,
  cache({ ttl: 60 }), // Cache for 1 minute
  cartController.getCart
);

/**
 * Add Item to Cart
 * POST /:userId/items
 * 
 * Adds a new item to the user's cart or updates quantity if item exists.
 * Validates product availability and stock levels before adding.
 */
router.post('/:userId/items',
  authenticate,
  userIdValidation,
  ...addItemValidation,
  validateRequest,
  cartController.addItemToCart
);

/**
 * Update Item Quantity
 * PUT /:userId/items/:productId
 * 
 * Updates the quantity of a specific item in the cart.
 * Setting quantity to 0 removes the item from cart.
 */
router.put('/:userId/items/:productId',
  authenticate,
  userIdValidation,
  productIdValidation,
  ...updateQuantityValidation,
  validateRequest,
  cartController.updateItemQuantity
);

/**
 * Remove Item from Cart
 * DELETE /:userId/items/:productId
 * 
 * Removes a specific item completely from the user's cart.
 */
router.delete('/:userId/items/:productId',
  authenticate,
  userIdValidation,
  productIdValidation,
  validateRequest,
  cartController.removeItemFromCart
);

/**
 * Clear Cart
 * DELETE /:userId
 * 
 * Removes all items from the user's cart.
 * Useful for cart reset or after successful checkout.
 */
router.delete('/:userId',
  authenticate,
  userIdValidation,
  validateRequest,
  cartController.clearCart
);

/**
 * Prepare Checkout
 * POST /:userId/checkout
 * 
 * Validates cart contents and prepares checkout data including:
 * - Final pricing calculations
 * - Stock availability verification
 * - Shipping and tax calculations
 * - Payment preparation
 */
router.post('/:userId/checkout',
  authenticate,
  userIdValidation,
  ...checkoutValidation,
  validateRequest,
  cartController.prepareCheckout
);

/**
 * Get Cart Statistics (Admin/Analytics)
 * GET /stats/overview
 * 
 * Provides aggregate statistics about cart usage:
 * - Total active carts
 * - Average cart value
 * - Most popular products in carts
 * - Abandonment rates
 */
router.get('/stats/overview',
  authenticate,
  // Add admin role check here if implementing RBAC
  cache({ ttl: 300 }), // Cache for 5 minutes
  cartController.getCartStatistics
);

/**
 * Health Check for Cart Routes
 * GET /health
 * 
 * Validates that cart routes and dependencies are working correctly.
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'cart-routes',
    timestamp: new Date().toISOString(),
    routes: {
      total: router.stack.length,
      authenticated: router.stack.filter(layer => 
        layer.route?.stack.some(s => s.handle.name === 'authenticate')
      ).length
    }
  });
});

export default router;
