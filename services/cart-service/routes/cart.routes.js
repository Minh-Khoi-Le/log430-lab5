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

// Import shared middleware
import { 
  authenticate,
  validateId
} from '../../shared/index.js';

import * as cartController from '../controllers/cart.controller.js';

const router = express.Router();

/**
 * Cart Management Routes
 */

// Create new cart
router.post('/',
  authenticate,
  cartController.createCart
);

// Get user's cart
router.get('/:cartId',
  authenticate,
  validateId('cartId'),
  cartController.getCart
);

// Add item to cart
router.post('/:cartId/items',
  authenticate,
  validateId('cartId'),
  cartController.addItemToCart
);

// Update item quantity in cart
router.put('/:cartId/items/:itemId',
  authenticate,
  validateId('cartId'),
  validateId('itemId'),
  cartController.updateCartItem
);

// Remove item from cart
router.delete('/:cartId/items/:itemId',
  authenticate,
  validateId('cartId'),
  validateId('itemId'),
  cartController.removeItemFromCart
);

// Clear entire cart
router.delete('/:cartId',
  authenticate,
  validateId('cartId'),
  cartController.clearCart
);

// Prepare cart for checkout
router.post('/:cartId/checkout',
  authenticate,
  validateId('cartId'),
  cartController.prepareCheckout
);

// Get cart statistics
router.get('/:cartId/statistics',
  authenticate,
  validateId('cartId'),
  cartController.getCartStatistics
);

export default router;
