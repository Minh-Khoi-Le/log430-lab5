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
} from '@log430/shared';

import * as cartController from '../controllers/cart.controller.js';

const router = express.Router();

/**
 * Cart Management Routes
 */

// Get user's cart
router.get('/:userId',
  authenticate,
  validateId('userId'),
  cartController.getCart
);

// Add item to cart
router.post('/:userId/items',
  authenticate,
  validateId('userId'),
  cartController.addItem
);

// Update item quantity in cart
router.put('/:userId/items/:productId',
  authenticate,
  validateId('userId'),
  validateId('productId'),
  cartController.updateItem
);

// Remove item from cart
router.delete('/:userId/items/:productId',
  authenticate,
  validateId('userId'),
  validateId('productId'),
  cartController.removeItem
);

// Clear entire cart
router.delete('/:userId',
  authenticate,
  validateId('userId'),
  cartController.clearCart
);

// Prepare cart for checkout
router.post('/:userId/checkout',
  authenticate,
  validateId('userId'),
  cartController.prepareCheckout
);

// Get cart summary (items count, total price)
router.get('/:userId/summary',
  authenticate,
  validateId('userId'),
  cartController.getCartSummary
);

export default router;
