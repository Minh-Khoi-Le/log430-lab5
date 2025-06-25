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
 * @version 1.0.0
 */

import CartService from '../services/cart.service.js';
import { promClient } from '../middleware/metrics.js';
import logger from '../utils/logger.js';

// Metrics for cart operations
const cartOperationCounter = new promClient.Counter({
  name: 'cart_operations_total',
  help: 'Total number of cart operations',
  labelNames: ['operation', 'status', 'store_id']
});

const cartOperationDuration = new promClient.Histogram({
  name: 'cart_operation_duration_seconds',
  help: 'Duration of cart operations in seconds',
  labelNames: ['operation']
});

const activeCartsGauge = new promClient.Gauge({
  name: 'active_carts_total',
  help: 'Total number of active carts',
  labelNames: ['store_id']
});

const cartValueGauge = new promClient.Gauge({
  name: 'cart_value_total',
  help: 'Total value of all active carts',
  labelNames: ['store_id']
});

/**
 * Create Cart Controller
 * 
 * Creates a new shopping cart for a customer
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const createCart = async (req, res, next) => {
  const timer = cartOperationDuration.startTimer({ operation: 'create_cart' });
  
  try {
    logger.info('Creating new cart', {
      storeId: req.body.storeId,
      customerId: req.body.customerId,
      userId: req.user?.id,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    const cartData = {
      storeId: req.body.storeId,
      customerId: req.body.customerId,
      sessionId: req.body.sessionId,
      currency: req.body.currency || 'CAD',
      expiresAt: req.body.expiresAt
    };

    const cart = await CartService.createCart(cartData, req.user);

    // Update metrics
    cartOperationCounter.inc({
      operation: 'create_cart',
      status: 'success',
      store_id: cart.storeId
    });

    activeCartsGauge.inc({ store_id: cart.storeId });

    logger.info('Cart created successfully', {
      cartId: cart.id,
      storeId: cart.storeId,
      customerId: cart.customerId,
      userId: req.user?.id
    });

    res.status(201).json({
      success: true,
      message: 'Cart created successfully',
      data: cart,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating cart', {
      error: error.message,
      stack: error.stack,
      storeId: req.body.storeId,
      userId: req.user?.id,
      ip: req.ip
    });

    cartOperationCounter.inc({
      operation: 'create_cart',
      status: 'error',
      store_id: req.body.storeId || 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Get Cart Controller
 * 
 * Retrieves a user's cart with all items and details
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getCart = async (req, res, next) => {
  const timer = cartOperationDuration.startTimer({ operation: 'get_cart' });
  
  try {
    const { userId } = req.params;
    const { storeId } = req.query;

    logger.info('Retrieving cart for user', {
      userId,
      storeId,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    const cart = await CartService.getUserCart(userId, storeId);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
        error: 'CART_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    // Update metrics
    cartOperationCounter.inc({
      operation: 'get_cart',
      status: 'success',
      store_id: cart.storeId || 'unknown'
    });

    logger.info('Cart retrieved successfully', {
      cartId: cart.id,
      userId,
      storeId: cart.storeId,
      itemCount: cart.items?.length || 0,
      totalValue: cart.totalAmount,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Cart retrieved successfully',
      data: cart,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error retrieving cart', {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId,
      storeId: req.query.storeId,
      ip: req.ip
    });

    cartOperationCounter.inc({
      operation: 'get_cart',
      status: 'error',
      store_id: req.query.storeId || 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Add Item to Cart Controller
 * 
 * Adds an item to the shopping cart
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const addItemToCart = async (req, res, next) => {
  const timer = cartOperationDuration.startTimer({ operation: 'add_item' });
  
  try {
    const cartId = req.params.cartId;
    const itemData = {
      productId: req.body.productId,
      quantity: req.body.quantity,
      customizations: req.body.customizations || []
    };

    logger.info('Adding item to cart', {
      cartId,
      productId: itemData.productId,
      quantity: itemData.quantity,
      userId: req.user?.id
    });

    const cart = await CartService.addItem(cartId, itemData);

    // Update metrics
    cartOperationCounter.inc({
      operation: 'add_item',
      status: 'success',
      store_id: cart.storeId
    });

    cartValueGauge.set({ store_id: cart.storeId }, cart.totalAmount);

    logger.info('Item added to cart successfully', {
      cartId,
      productId: itemData.productId,
      quantity: itemData.quantity,
      newTotal: cart.totalAmount,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Item added to cart successfully',
      data: cart,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error adding item to cart', {
      error: error.message,
      cartId: req.params.cartId,
      productId: req.body.productId,
      userId: req.user?.id
    });

    cartOperationCounter.inc({
      operation: 'add_item',
      status: 'error',
      store_id: 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Update Item in Cart Controller
 * 
 * Updates the quantity of an item in the cart
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const updateCartItem = async (req, res, next) => {
  const timer = cartOperationDuration.startTimer({ operation: 'update_item' });
  
  try {
    const cartId = req.params.cartId;
    const productId = parseInt(req.params.productId);
    const { quantity } = req.body;

    logger.info('Updating cart item', {
      cartId,
      productId,
      quantity,
      userId: req.user?.id
    });

    const cart = await CartService.updateItem(cartId, productId, quantity);

    // Update metrics
    cartOperationCounter.inc({
      operation: 'update_item',
      status: 'success',
      store_id: cart.storeId
    });

    cartValueGauge.set({ store_id: cart.storeId }, cart.totalAmount);

    logger.info('Cart item updated successfully', {
      cartId,
      productId,
      quantity,
      newTotal: cart.totalAmount,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Cart item updated successfully',
      data: cart,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error updating cart item', {
      error: error.message,
      cartId: req.params.cartId,
      productId: req.params.productId,
      userId: req.user?.id
    });

    cartOperationCounter.inc({
      operation: 'update_item',
      status: 'error',
      store_id: 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Remove Item from Cart Controller
 * 
 * Removes an item from the shopping cart
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const removeItemFromCart = async (req, res, next) => {
  const timer = cartOperationDuration.startTimer({ operation: 'remove_item' });
  
  try {
    const cartId = req.params.cartId;
    const productId = parseInt(req.params.productId);

    logger.info('Removing item from cart', {
      cartId,
      productId,
      userId: req.user?.id
    });

    const cart = await CartService.removeItem(cartId, productId);

    // Update metrics
    cartOperationCounter.inc({
      operation: 'remove_item',
      status: 'success',
      store_id: cart.storeId
    });

    cartValueGauge.set({ store_id: cart.storeId }, cart.totalAmount);

    logger.info('Item removed from cart successfully', {
      cartId,
      productId,
      newTotal: cart.totalAmount,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Item removed from cart successfully',
      data: cart,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error removing item from cart', {
      error: error.message,
      cartId: req.params.cartId,
      productId: req.params.productId,
      userId: req.user?.id
    });

    cartOperationCounter.inc({
      operation: 'remove_item',
      status: 'error',
      store_id: 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Clear Cart Controller
 * 
 * Removes all items from the cart
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const clearCart = async (req, res, next) => {
  const timer = cartOperationDuration.startTimer({ operation: 'clear_cart' });
  
  try {
    const cartId = req.params.cartId;

    logger.info('Clearing cart', {
      cartId,
      userId: req.user?.id
    });

    const cart = await CartService.clearCart(cartId);

    // Update metrics
    cartOperationCounter.inc({
      operation: 'clear_cart',
      status: 'success',
      store_id: cart.storeId
    });

    cartValueGauge.set({ store_id: cart.storeId }, 0);

    logger.info('Cart cleared successfully', {
      cartId,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: cart,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error clearing cart', {
      error: error.message,
      cartId: req.params.cartId,
      userId: req.user?.id
    });

    cartOperationCounter.inc({
      operation: 'clear_cart',
      status: 'error',
      store_id: 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Apply Discount Controller
 * 
 * Applies a discount code to the cart
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const applyDiscount = async (req, res, next) => {
  const timer = cartOperationDuration.startTimer({ operation: 'apply_discount' });
  
  try {
    const cartId = req.params.cartId;
    const { discountCode } = req.body;

    logger.info('Applying discount to cart', {
      cartId,
      discountCode,
      userId: req.user?.id
    });

    const cart = await CartService.applyDiscount(cartId, discountCode);

    // Update metrics
    cartOperationCounter.inc({
      operation: 'apply_discount',
      status: 'success',
      store_id: cart.storeId
    });

    cartValueGauge.set({ store_id: cart.storeId }, cart.totalAmount);

    logger.info('Discount applied successfully', {
      cartId,
      discountCode,
      discountAmount: cart.discountAmount,
      newTotal: cart.totalAmount,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Discount applied successfully',
      data: cart,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error applying discount', {
      error: error.message,
      cartId: req.params.cartId,
      discountCode: req.body.discountCode,
      userId: req.user?.id
    });

    cartOperationCounter.inc({
      operation: 'apply_discount',
      status: 'error',
      store_id: 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Validate Cart Controller
 * 
 * Validates cart contents against current prices and stock levels
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const validateCart = async (req, res, next) => {
  const timer = cartOperationDuration.startTimer({ operation: 'validate_cart' });
  
  try {
    const cartId = req.params.cartId;

    logger.info('Validating cart', {
      cartId,
      userId: req.user?.id
    });

    const validation = await CartService.validateCart(cartId);

    // Update metrics
    cartOperationCounter.inc({
      operation: 'validate_cart',
      status: 'success',
      store_id: validation.cart.storeId
    });

    logger.info('Cart validation completed', {
      cartId,
      isValid: validation.isValid,
      issueCount: validation.issues.length,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Cart validation completed',
      data: validation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error validating cart', {
      error: error.message,
      cartId: req.params.cartId,
      userId: req.user?.id
    });

    cartOperationCounter.inc({
      operation: 'validate_cart',
      status: 'error',
      store_id: 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Checkout Cart Controller
 * 
 * Processes cart checkout and creates a sale
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const checkoutCart = async (req, res, next) => {
  const timer = cartOperationDuration.startTimer({ operation: 'checkout_cart' });
  
  try {
    const cartId = req.params.cartId;
    const checkoutData = {
      paymentMethod: req.body.paymentMethod,
      paymentDetails: req.body.paymentDetails,
      shippingAddress: req.body.shippingAddress,
      billingAddress: req.body.billingAddress,
      notes: req.body.notes
    };

    logger.info('Processing cart checkout', {
      cartId,
      paymentMethod: checkoutData.paymentMethod,
      userId: req.user?.id
    });

    const result = await CartService.checkout(cartId, checkoutData, req.user);

    // Update metrics
    cartOperationCounter.inc({
      operation: 'checkout_cart',
      status: 'success',
      store_id: result.sale.storeId
    });

    // Cart is now inactive
    activeCartsGauge.dec({ store_id: result.sale.storeId });
    cartValueGauge.set({ store_id: result.sale.storeId }, 0);

    logger.info('Cart checkout completed successfully', {
      cartId,
      saleId: result.sale.id,
      totalAmount: result.sale.totalAmount,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Checkout completed successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error processing cart checkout', {
      error: error.message,
      cartId: req.params.cartId,
      paymentMethod: req.body.paymentMethod,
      userId: req.user?.id
    });

    cartOperationCounter.inc({
      operation: 'checkout_cart',
      status: 'error',
      store_id: 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Get Customer Carts Controller
 * 
 * Retrieves all carts for a specific customer
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getCustomerCarts = async (req, res, next) => {
  const timer = cartOperationDuration.startTimer({ operation: 'get_customer_carts' });
  
  try {
    const customerId = parseInt(req.params.customerId);
    const filters = {
      status: req.query.status,
      storeId: req.query.storeId ? parseInt(req.query.storeId) : null
    };

    logger.info('Retrieving customer carts', {
      customerId,
      filters,
      userId: req.user?.id
    });

    const carts = await CartService.getCustomerCarts(customerId, filters);

    // Update metrics
    cartOperationCounter.inc({
      operation: 'get_customer_carts',
      status: 'success',
      store_id: filters.storeId || 'all'
    });

    logger.info('Customer carts retrieved successfully', {
      customerId,
      cartCount: carts.length,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Customer carts retrieved successfully',
      data: carts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error retrieving customer carts', {
      error: error.message,
      customerId: req.params.customerId,
      userId: req.user?.id
    });

    cartOperationCounter.inc({
      operation: 'get_customer_carts',
      status: 'error',
      store_id: 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Delete Cart Controller
 * 
 * Permanently deletes a cart
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const deleteCart = async (req, res, next) => {
  const timer = cartOperationDuration.startTimer({ operation: 'delete_cart' });
  
  try {
    const cartId = req.params.cartId;

    logger.info('Deleting cart', {
      cartId,
      userId: req.user?.id
    });

    const result = await CartService.deleteCart(cartId);

    // Update metrics
    cartOperationCounter.inc({
      operation: 'delete_cart',
      status: 'success',
      store_id: result.storeId
    });

    activeCartsGauge.dec({ store_id: result.storeId });

    logger.info('Cart deleted successfully', {
      cartId,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Cart deleted successfully',
      data: { cartId, deleted: true },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error deleting cart', {
      error: error.message,
      cartId: req.params.cartId,
      userId: req.user?.id
    });

    cartOperationCounter.inc({
      operation: 'delete_cart',
      status: 'error',
      store_id: 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Update Item Quantity Controller
 * 
 * Updates the quantity of a specific item in the cart
 * Setting quantity to 0 removes the item from cart
 * 
 * @param {Object} req - Express request object with userId, productId, and quantity
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const updateItemQuantity = async (req, res, next) => {
  const timer = cartOperationDuration.startTimer({ operation: 'update_item_quantity' });
  
  try {
    const { userId, productId } = req.params;
    const { quantity } = req.body;

    logger.info('Updating item quantity in cart', {
      userId,
      productId,
      quantity,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Get user's cart
    const cart = await CartService.getUserCart(userId);
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
        error: 'NO_CART_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    // Update item quantity (or remove if quantity is 0)
    const updatedCart = quantity === 0 
      ? await CartService.removeItem(cart.id, productId)
      : await CartService.updateItemQuantity(cart.id, productId, quantity);

    // Update metrics
    cartOperationCounter.inc({
      operation: 'update_item_quantity',
      status: 'success',
      store_id: updatedCart.storeId
    });

    logger.info('Item quantity updated successfully', {
      cartId: cart.id,
      productId,
      newQuantity: quantity,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: quantity === 0 ? 'Item removed from cart' : 'Item quantity updated',
      data: updatedCart,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error updating item quantity', {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId,
      productId: req.params.productId,
      quantity: req.body.quantity,
      ip: req.ip
    });

    cartOperationCounter.inc({
      operation: 'update_item_quantity',
      status: 'error',
      store_id: 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Prepare Checkout Controller
 * 
 * Validates cart contents and prepares checkout data including:
 * - Final pricing calculations
 * - Stock availability verification
 * - Shipping and tax calculations
 * - Payment preparation
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const prepareCheckout = async (req, res, next) => {
  const timer = cartOperationDuration.startTimer({ operation: 'prepare_checkout' });
  
  try {
    const { userId } = req.params;
    const { storeId, shippingAddress, paymentMethod } = req.body;

    logger.info('Preparing checkout for cart', {
      userId,
      storeId,
      paymentMethod,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Get user's cart
    const cart = await CartService.getUserCart(userId);
    if (!cart?.items?.length) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty or not found',
        error: 'EMPTY_CART',
        timestamp: new Date().toISOString()
      });
    }

    // Prepare checkout data
    const checkoutData = await CartService.prepareCheckout(cart.id, {
      storeId,
      shippingAddress,
      paymentMethod,
      userId: req.user?.id
    });

    // Update metrics
    cartOperationCounter.inc({
      operation: 'prepare_checkout',
      status: 'success',
      store_id: storeId
    });

    logger.info('Checkout prepared successfully', {
      cartId: cart.id,
      storeId,
      totalAmount: checkoutData.total,
      itemCount: checkoutData.items.length,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Checkout prepared successfully',
      data: checkoutData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error preparing checkout', {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId,
      storeId: req.body.storeId,
      ip: req.ip
    });

    cartOperationCounter.inc({
      operation: 'prepare_checkout',
      status: 'error',
      store_id: req.body.storeId || 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Get Cart Statistics Controller
 * 
 * Provides aggregate statistics about cart usage for admin/analytics
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getCartStatistics = async (req, res, next) => {
  const timer = cartOperationDuration.startTimer({ operation: 'get_statistics' });
  
  try {
    logger.info('Retrieving cart statistics', {
      userId: req.user?.id,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    const statistics = await CartService.getStatistics();

    // Update metrics
    cartOperationCounter.inc({
      operation: 'get_statistics',
      status: 'success',
      store_id: 'all'
    });

    logger.info('Cart statistics retrieved successfully', {
      totalCarts: statistics.totalActiveCarts,
      averageValue: statistics.averageCartValue,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Cart statistics retrieved successfully',
      data: statistics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error retrieving cart statistics', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      ip: req.ip
    });

    cartOperationCounter.inc({
      operation: 'get_statistics',
      status: 'error',
      store_id: 'all'
    });

    next(error);
  } finally {
    timer();
  }
};
