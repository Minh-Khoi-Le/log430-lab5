/**
 * Cart Controller for Cart Service
 * 
 * This controller manages all shopping cart operations in the microservices architecture.
 * It provides endpoints for cart management, item operations, and checkout processing.
 * 
 * Features:
 * - Cart creation and management
 * - Item addition, removal, and quantity updates
 * - Cart validation against stock levels
 * - Cart persistence with Redis
 * - Integration with Product and Stock services
 * - Checkout processing with Sales service
 * - Cart expiration and cleanup
 * 
 * @author Cart Service Team
 * @version 2.0.0
 */

import CartService from '../services/cart.service.js';

// Import shared components
import {
  ValidationError,
  NotFoundError,
  logger,
  asyncHandler,
  recordOperation
} from '../../shared/index.js';

/**
 * Create Cart Controller
 * 
 * Creates a new shopping cart for a customer
 */
export const createCart = asyncHandler(async (req, res) => {
  const { storeId, customerId, sessionId, currency, expiresAt } = req.body;

  // Basic input validation
  if (!storeId) {
    throw new ValidationError('Store ID is required');
  }

  if (!customerId && !sessionId) {
    throw new ValidationError('Either customer ID or session ID is required');
  }

  logger.info('Creating new cart', {
    storeId,
    customerId,
    sessionId,
    userId: req.user?.id,
    ip: req.ip
  });

  recordOperation('cart_create', 'start');

  try {
    const cartData = {
      storeId,
      customerId,
      sessionId,
      currency: currency || 'CAD',
      expiresAt,
      userId: req.user?.id
    };

    const cart = await CartService.createCart(cartData, req.user);

    recordOperation('cart_create', 'success');

    logger.info('Cart created successfully', {
      cartId: cart.id,
      storeId: cart.storeId,
      customerId: cart.customerId,
      userId: req.user?.id
    });

    res.status(201).json({
      success: true,
      message: 'Cart created successfully',
      data: cart
    });
  } catch (error) {
    recordOperation('cart_create', 'error');
    throw error;
  }
});

/**
 * Get Cart Controller
 * 
 * Retrieves a cart by ID
 */
export const getCart = asyncHandler(async (req, res) => {
  const { cartId } = req.params;

  if (!cartId) {
    throw new ValidationError('Cart ID is required');
  }

  logger.info('Retrieving cart', {
    cartId,
    userId: req.user?.id
  });

  recordOperation('cart_get', 'start');

  try {
    const cart = await CartService.getCart(cartId, req.user);

    if (!cart) {
      throw new NotFoundError('Cart not found');
    }

    recordOperation('cart_get', 'success');

    logger.info('Cart retrieved successfully', {
      cartId: cart.id,
      itemCount: cart.items?.length || 0
    });

    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    recordOperation('cart_get', 'error');
    throw error;
  }
});

/**
 * Add Item to Cart Controller
 * 
 * Adds an item to a shopping cart
 */
export const addItemToCart = asyncHandler(async (req, res) => {
  const { cartId } = req.params;
  const { productId, quantity, price, metadata } = req.body;

  // Input validation
  if (!cartId) {
    throw new ValidationError('Cart ID is required');
  }

  if (!productId || !quantity || quantity <= 0) {
    throw new ValidationError('Product ID and positive quantity are required');
  }

  logger.info('Adding item to cart', {
    cartId,
    productId,
    quantity,
    userId: req.user?.id
  });

  recordOperation('cart_add_item', 'start');

  try {
    const itemData = {
      productId,
      quantity,
      price,
      metadata
    };

    const cart = await CartService.addItemToCart(cartId, itemData, req.user);

    recordOperation('cart_add_item', 'success');

    logger.info('Item added to cart successfully', {
      cartId,
      productId,
      quantity,
      totalItems: cart.items?.length || 0
    });

    res.json({
      success: true,
      message: 'Item added to cart successfully',
      data: cart
    });
  } catch (error) {
    recordOperation('cart_add_item', 'error');
    throw error;
  }
});

/**
 * Update Cart Item Controller
 * 
 * Updates an item in the cart
 */
export const updateCartItem = asyncHandler(async (req, res) => {
  const { cartId, itemId } = req.params;
  const { quantity, price, metadata } = req.body;

  // Input validation
  if (!cartId || !itemId) {
    throw new ValidationError('Cart ID and item ID are required');
  }

  if (quantity !== undefined && quantity <= 0) {
    throw new ValidationError('Quantity must be positive');
  }

  logger.info('Updating cart item', {
    cartId,
    itemId,
    quantity,
    userId: req.user?.id
  });

  recordOperation('cart_update_item', 'start');

  try {
    const updateData = { quantity, price, metadata };
    const cart = await CartService.updateCartItem(cartId, itemId, updateData, req.user);

    recordOperation('cart_update_item', 'success');

    logger.info('Cart item updated successfully', {
      cartId,
      itemId,
      quantity
    });

    res.json({
      success: true,
      message: 'Cart item updated successfully',
      data: cart
    });
  } catch (error) {
    recordOperation('cart_update_item', 'error');
    throw error;
  }
});

/**
 * Remove Item from Cart Controller
 * 
 * Removes an item from the cart
 */
export const removeItemFromCart = asyncHandler(async (req, res) => {
  const { cartId, itemId } = req.params;

  // Input validation
  if (!cartId || !itemId) {
    throw new ValidationError('Cart ID and item ID are required');
  }

  logger.info('Removing item from cart', {
    cartId,
    itemId,
    userId: req.user?.id
  });

  recordOperation('cart_remove_item', 'start');

  try {
    const cart = await CartService.removeItemFromCart(cartId, itemId, req.user);

    recordOperation('cart_remove_item', 'success');

    logger.info('Item removed from cart successfully', {
      cartId,
      itemId,
      remainingItems: cart.items?.length || 0
    });

    res.json({
      success: true,
      message: 'Item removed from cart successfully',
      data: cart
    });
  } catch (error) {
    recordOperation('cart_remove_item', 'error');
    throw error;
  }
});

/**
 * Clear Cart Controller
 * 
 * Removes all items from the cart
 */
export const clearCart = asyncHandler(async (req, res) => {
  const { cartId } = req.params;

  if (!cartId) {
    throw new ValidationError('Cart ID is required');
  }

  logger.info('Clearing cart', {
    cartId,
    userId: req.user?.id
  });

  recordOperation('cart_clear', 'start');

  try {
    const cart = await CartService.clearCart(cartId, req.user);

    recordOperation('cart_clear', 'success');

    logger.info('Cart cleared successfully', {
      cartId
    });

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: cart
    });
  } catch (error) {
    recordOperation('cart_clear', 'error');
    throw error;
  }
});

/**
 * Apply Discount Controller
 * 
 * Applies a discount code to the cart
 */
export const applyDiscount = asyncHandler(async (req, res) => {
  const { cartId } = req.params;
  const { discountCode, discountType, discountValue } = req.body;

  // Input validation
  if (!cartId) {
    throw new ValidationError('Cart ID is required');
  }

  if (!discountCode && (!discountType || !discountValue)) {
    throw new ValidationError('Either discount code or discount type and value are required');
  }

  logger.info('Applying discount to cart', {
    cartId,
    discountCode,
    discountType,
    userId: req.user?.id
  });

  recordOperation('cart_apply_discount', 'start');

  try {
    const discountData = {
      discountCode,
      discountType,
      discountValue
    };

    const cart = await CartService.applyDiscount(cartId, discountData, req.user);

    recordOperation('cart_apply_discount', 'success');

    logger.info('Discount applied successfully', {
      cartId,
      discountCode,
      discountAmount: cart.discount?.amount
    });

    res.json({
      success: true,
      message: 'Discount applied successfully',
      data: cart
    });
  } catch (error) {
    recordOperation('cart_apply_discount', 'error');
    throw error;
  }
});

/**
 * Validate Cart Controller
 * 
 * Validates cart items against current stock and pricing
 */
export const validateCart = asyncHandler(async (req, res) => {
  const { cartId } = req.params;

  if (!cartId) {
    throw new ValidationError('Cart ID is required');
  }

  logger.info('Validating cart', {
    cartId,
    userId: req.user?.id
  });

  recordOperation('cart_validate', 'start');

  try {
    const validation = await CartService.validateCart(cartId, req.user);

    recordOperation('cart_validate', 'success');

    logger.info('Cart validation completed', {
      cartId,
      isValid: validation.isValid,
      issues: validation.issues?.length || 0
    });

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    recordOperation('cart_validate', 'error');
    throw error;
  }
});

/**
 * Checkout Cart Controller
 * 
 * Processes cart checkout and creates a sale
 */
export const checkoutCart = asyncHandler(async (req, res) => {
  const { cartId } = req.params;
  const { paymentMethod, billingAddress, shippingAddress } = req.body;

  // Input validation
  if (!cartId) {
    throw new ValidationError('Cart ID is required');
  }

  if (!paymentMethod) {
    throw new ValidationError('Payment method is required');
  }

  logger.info('Processing cart checkout', {
    cartId,
    paymentMethod,
    userId: req.user?.id
  });

  recordOperation('cart_checkout', 'start');

  try {
    const checkoutData = {
      paymentMethod,
      billingAddress,
      shippingAddress
    };

    const sale = await CartService.checkoutCart(cartId, checkoutData, req.user);

    recordOperation('cart_checkout', 'success');

    logger.info('Cart checkout completed successfully', {
      cartId,
      saleId: sale.id,
      totalAmount: sale.totalAmount
    });

    res.json({
      success: true,
      message: 'Checkout completed successfully',
      data: sale
    });
  } catch (error) {
    recordOperation('cart_checkout', 'error');
    throw error;
  }
});

/**
 * Get Customer Carts Controller
 * 
 * Retrieves all carts for a customer
 */
export const getCustomerCarts = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const { page = 1, limit = 10, status } = req.query;

  if (!customerId) {
    throw new ValidationError('Customer ID is required');
  }

  logger.info('Retrieving customer carts', {
    customerId,
    page,
    limit,
    status,
    userId: req.user?.id
  });

  recordOperation('cart_get_customer', 'start');

  try {
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    };

    const result = await CartService.getCustomerCarts(customerId, options, req.user);

    recordOperation('cart_get_customer', 'success');

    logger.info('Customer carts retrieved successfully', {
      customerId,
      cartCount: result.carts?.length || 0,
      totalCount: result.total
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    recordOperation('cart_get_customer', 'error');
    throw error;
  }
});

/**
 * Delete Cart Controller
 * 
 * Deletes a cart permanently
 */
export const deleteCart = asyncHandler(async (req, res) => {
  const { cartId } = req.params;

  if (!cartId) {
    throw new ValidationError('Cart ID is required');
  }

  logger.info('Deleting cart', {
    cartId,
    userId: req.user?.id
  });

  recordOperation('cart_delete', 'start');

  try {
    await CartService.deleteCart(cartId, req.user);

    recordOperation('cart_delete', 'success');

    logger.info('Cart deleted successfully', {
      cartId
    });

    res.json({
      success: true,
      message: 'Cart deleted successfully'
    });
  } catch (error) {
    recordOperation('cart_delete', 'error');
    throw error;
  }
});

/**
 * Update Item Quantity Controller
 * 
 * Updates the quantity of a specific item in the cart
 */
export const updateItemQuantity = asyncHandler(async (req, res) => {
  const { cartId, itemId } = req.params;
  const { quantity } = req.body;

  // Input validation
  if (!cartId || !itemId) {
    throw new ValidationError('Cart ID and item ID are required');
  }

  if (!quantity || quantity <= 0) {
    throw new ValidationError('Positive quantity is required');
  }

  logger.info('Updating item quantity', {
    cartId,
    itemId,
    quantity,
    userId: req.user?.id
  });

  recordOperation('cart_update_quantity', 'start');

  try {
    const cart = await CartService.updateItemQuantity(cartId, itemId, quantity, req.user);

    recordOperation('cart_update_quantity', 'success');

    logger.info('Item quantity updated successfully', {
      cartId,
      itemId,
      quantity
    });

    res.json({
      success: true,
      message: 'Item quantity updated successfully',
      data: cart
    });
  } catch (error) {
    recordOperation('cart_update_quantity', 'error');
    throw error;
  }
});

/**
 * Prepare Checkout Controller
 * 
 * Prepares cart for checkout by validating and calculating totals
 */
export const prepareCheckout = asyncHandler(async (req, res) => {
  const { cartId } = req.params;
  const { shippingMethod, taxInfo } = req.body;

  if (!cartId) {
    throw new ValidationError('Cart ID is required');
  }

  logger.info('Preparing cart for checkout', {
    cartId,
    shippingMethod,
    userId: req.user?.id
  });

  recordOperation('cart_prepare_checkout', 'start');

  try {
    const checkoutData = {
      shippingMethod,
      taxInfo
    };

    const checkout = await CartService.prepareCheckout(cartId, checkoutData, req.user);

    recordOperation('cart_prepare_checkout', 'success');

    logger.info('Cart prepared for checkout successfully', {
      cartId,
      totalAmount: checkout.totalAmount,
      isValid: checkout.isValid
    });

    res.json({
      success: true,
      data: checkout
    });
  } catch (error) {
    recordOperation('cart_prepare_checkout', 'error');
    throw error;
  }
});

/**
 * Get Cart Statistics Controller
 * 
 * Retrieves cart statistics for analytics
 */
export const getCartStatistics = asyncHandler(async (req, res) => {
  const { storeId, period, startDate, endDate } = req.query;

  logger.info('Retrieving cart statistics', {
    storeId,
    period,
    startDate,
    endDate,
    userId: req.user?.id
  });

  recordOperation('cart_statistics', 'start');

  try {
    const filters = {
      storeId,
      period,
      startDate,
      endDate
    };

    const statistics = await CartService.getCartStatistics(filters, req.user);

    recordOperation('cart_statistics', 'success');

    logger.info('Cart statistics retrieved successfully', {
      storeId,
      period,
      totalCarts: statistics.totalCarts
    });

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    recordOperation('cart_statistics', 'error');
    throw error;
  }
});
