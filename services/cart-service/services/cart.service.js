/**
 * Cart Service
 * 
 * Core business logic for shopping cart operations in the microservices architecture.
 * This service handles cart management, item operations, and checkout processing.
 * 
 * Features:
 * - Redis-based cart persistence for session management
 * - Integration with Product and Stock services
 * - Cart validation against stock levels and pricing
 * - Checkout processing with Sales service
 * - Cart expiration and cleanup policies
 * - Discount and promotion handling
 * 
 * @author Cart Service Team
 * @version 1.0.0
 */

import { ApiError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import { getRedisClient } from '../utils/redis.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

/**
 * Cart Service Class
 * 
 * Encapsulates all business logic for cart operations
 */
class CartService {
  
  constructor() {
    this.CART_PREFIX = 'cart:';
    this.DEFAULT_EXPIRY = 24 * 60 * 60; // 24 hours in seconds
    this.CUSTOMER_CARTS_PREFIX = 'customer_carts:';
  }

  /**
   * Create a new shopping cart
   * 
   * @param {Object} cartData - Cart creation data
   * @param {number} cartData.storeId - Store ID
   * @param {number} cartData.customerId - Customer ID (optional)
   * @param {string} cartData.sessionId - Session ID (optional)
   * @param {string} cartData.currency - Currency code
   * @param {Date} cartData.expiresAt - Custom expiration date
   * @param {Object} userInfo - User information
   * @returns {Promise<Object>} Created cart
   */
  async createCart(cartData, userInfo = null) {
    const timer = logger.startTimer();
    
    try {
      logger.info('Creating new cart', {
        storeId: cartData.storeId,
        customerId: cartData.customerId,
        userId: userInfo?.id
      });

      // Validate required fields
      this.validateCartData(cartData);

      // Generate unique cart ID
      const cartId = uuidv4();

      // Calculate expiration time
      const expiresAt = cartData.expiresAt || new Date(Date.now() + (this.DEFAULT_EXPIRY * 1000));

      // Create cart object
      const cart = {
        id: cartId,
        storeId: cartData.storeId,
        customerId: cartData.customerId || null,
        sessionId: cartData.sessionId || null,
        status: 'ACTIVE',
        currency: cartData.currency || 'CAD',
        items: [],
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 0,
        discountCode: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        metadata: {
          createdBy: userInfo?.id || 'anonymous',
          userAgent: 'cart-service',
          version: '1.0'
        }
      };

      // Store cart in Redis
      await this.saveCart(cart);

      // Add to customer's cart list if customer is specified
      if (cartData.customerId) {
        await this.addToCustomerCarts(cartData.customerId, cartId);
      }

      logger.info('Cart created successfully', {
        cartId,
        storeId: cartData.storeId,
        customerId: cartData.customerId,
        duration: timer.getDuration()
      });

      return cart;

    } catch (error) {
      logger.error('Error creating cart', {
        error: error.message,
        storeId: cartData.storeId,
        customerId: cartData.customerId,
        duration: timer.getDuration()
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'Failed to create cart', 'CART_CREATION_FAILED');
    }
  }

  /**
   * Get cart by ID
   * 
   * @param {string} cartId - Cart ID
   * @returns {Promise<Object>} Cart with items
   */
  async getCart(cartId) {
    const timer = logger.startTimer();
    
    try {
      const cart = await this.loadCart(cartId);
      
      if (!cart) {
        throw new ApiError(404, 'Cart not found', 'CART_NOT_FOUND');
      }

      // Check if cart has expired
      if (new Date(cart.expiresAt) < new Date()) {
        await this.deleteCart(cartId);
        throw new ApiError(410, 'Cart has expired', 'CART_EXPIRED');
      }

      // Enrich items with product details
      await this.enrichCartItems(cart);

      logger.info('Cart retrieved successfully', {
        cartId,
        itemCount: cart.items.length,
        totalAmount: cart.totalAmount,
        duration: timer.getDuration()
      });

      return cart;

    } catch (error) {
      logger.error('Error retrieving cart', {
        error: error.message,
        cartId,
        duration: timer.getDuration()
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'Failed to retrieve cart', 'CART_RETRIEVAL_FAILED');
    }
  }

  /**
   * Add item to cart
   * 
   * @param {string} cartId - Cart ID
   * @param {Object} itemData - Item data
   * @param {number} itemData.productId - Product ID
   * @param {number} itemData.quantity - Quantity to add
   * @param {Array} itemData.customizations - Product customizations
   * @returns {Promise<Object>} Updated cart
   */
  async addItem(cartId, itemData) {
    const timer = logger.startTimer();
    
    try {
      logger.info('Adding item to cart', {
        cartId,
        productId: itemData.productId,
        quantity: itemData.quantity
      });

      // Validate item data
      this.validateItemData(itemData);

      // Load cart
      const cart = await this.getCart(cartId);

      // Get product details
      const product = await this.getProductDetails(itemData.productId);

      // Validate stock availability
      await this.validateStockAvailability(cart.storeId, itemData.productId, itemData.quantity);

      // Check if item already exists in cart
      const existingItemIndex = cart.items.findIndex(item => 
        item.productId === itemData.productId &&
        this.compareCustomizations(item.customizations, itemData.customizations)
      );

      if (existingItemIndex >= 0) {
        // Update existing item quantity
        cart.items[existingItemIndex].quantity += itemData.quantity;
        cart.items[existingItemIndex].totalPrice = 
          cart.items[existingItemIndex].quantity * cart.items[existingItemIndex].unitPrice;
      } else {
        // Add new item
        const cartItem = {
          id: uuidv4(),
          productId: itemData.productId,
          quantity: itemData.quantity,
          unitPrice: product.price,
          totalPrice: itemData.quantity * product.price,
          customizations: itemData.customizations || [],
          addedAt: new Date().toISOString()
        };

        cart.items.push(cartItem);
      }

      // Recalculate cart totals
      await this.recalculateCartTotals(cart);

      // Save updated cart
      await this.saveCart(cart);

      logger.info('Item added to cart successfully', {
        cartId,
        productId: itemData.productId,
        quantity: itemData.quantity,
        newTotal: cart.totalAmount,
        duration: timer.getDuration()
      });

      return cart;

    } catch (error) {
      logger.error('Error adding item to cart', {
        error: error.message,
        cartId,
        productId: itemData.productId,
        duration: timer.getDuration()
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'Failed to add item to cart', 'ITEM_ADD_FAILED');
    }
  }

  /**
   * Update item quantity in cart
   * 
   * @param {string} cartId - Cart ID
   * @param {number} productId - Product ID
   * @param {number} quantity - New quantity
   * @returns {Promise<Object>} Updated cart
   */
  async updateItem(cartId, productId, quantity) {
    const timer = logger.startTimer();
    
    try {
      logger.info('Updating cart item', {
        cartId,
        productId,
        quantity
      });

      if (quantity < 0) {
        throw new ApiError(400, 'Quantity cannot be negative', 'INVALID_QUANTITY');
      }

      // Load cart
      const cart = await this.getCart(cartId);

      // Find item
      const itemIndex = cart.items.findIndex(item => item.productId === productId);
      
      if (itemIndex === -1) {
        throw new ApiError(404, 'Item not found in cart', 'ITEM_NOT_FOUND');
      }

      if (quantity === 0) {
        // Remove item if quantity is 0
        cart.items.splice(itemIndex, 1);
      } else {
        // Validate stock availability for new quantity
        await this.validateStockAvailability(cart.storeId, productId, quantity);

        // Update item
        cart.items[itemIndex].quantity = quantity;
        cart.items[itemIndex].totalPrice = quantity * cart.items[itemIndex].unitPrice;
        cart.items[itemIndex].updatedAt = new Date().toISOString();
      }

      // Recalculate cart totals
      await this.recalculateCartTotals(cart);

      // Save updated cart
      await this.saveCart(cart);

      logger.info('Cart item updated successfully', {
        cartId,
        productId,
        quantity,
        newTotal: cart.totalAmount,
        duration: timer.getDuration()
      });

      return cart;

    } catch (error) {
      logger.error('Error updating cart item', {
        error: error.message,
        cartId,
        productId,
        duration: timer.getDuration()
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'Failed to update cart item', 'ITEM_UPDATE_FAILED');
    }
  }

  /**
   * Remove item from cart
   * 
   * @param {string} cartId - Cart ID
   * @param {number} productId - Product ID
   * @returns {Promise<Object>} Updated cart
   */
  async removeItem(cartId, productId) {
    return this.updateItem(cartId, productId, 0);
  }

  /**
   * Clear all items from cart
   * 
   * @param {string} cartId - Cart ID
   * @returns {Promise<Object>} Cleared cart
   */
  async clearCart(cartId) {
    const timer = logger.startTimer();
    
    try {
      logger.info('Clearing cart', { cartId });

      // Load cart
      const cart = await this.getCart(cartId);

      // Clear items
      cart.items = [];

      // Reset totals
      cart.subtotal = 0;
      cart.taxAmount = 0;
      cart.totalAmount = 0;
      cart.discountAmount = 0;
      cart.discountCode = null;
      cart.updatedAt = new Date().toISOString();

      // Save updated cart
      await this.saveCart(cart);

      logger.info('Cart cleared successfully', {
        cartId,
        duration: timer.getDuration()
      });

      return cart;

    } catch (error) {
      logger.error('Error clearing cart', {
        error: error.message,
        cartId,
        duration: timer.getDuration()
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'Failed to clear cart', 'CART_CLEAR_FAILED');
    }
  }

  /**
   * Apply discount to cart
   * 
   * @param {string} cartId - Cart ID
   * @param {string} discountCode - Discount code
   * @returns {Promise<Object>} Updated cart
   */
  async applyDiscount(cartId, discountCode) {
    const timer = logger.startTimer();
    
    try {
      logger.info('Applying discount to cart', {
        cartId,
        discountCode
      });

      // Load cart
      const cart = await this.getCart(cartId);

      // Validate discount code (simplified implementation)
      const discount = await this.validateDiscountCode(discountCode, cart);

      // Apply discount
      cart.discountCode = discountCode;
      cart.discountAmount = discount.amount;

      // Recalculate totals
      await this.recalculateCartTotals(cart);

      // Save updated cart
      await this.saveCart(cart);

      logger.info('Discount applied successfully', {
        cartId,
        discountCode,
        discountAmount: discount.amount,
        newTotal: cart.totalAmount,
        duration: timer.getDuration()
      });

      return cart;

    } catch (error) {
      logger.error('Error applying discount', {
        error: error.message,
        cartId,
        discountCode,
        duration: timer.getDuration()
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'Failed to apply discount', 'DISCOUNT_APPLICATION_FAILED');
    }
  }

  /**
   * Validate cart contents
   * 
   * @param {string} cartId - Cart ID
   * @returns {Promise<Object>} Validation result
   */
  async validateCart(cartId) {
    const timer = logger.startTimer();
    
    try {
      logger.info('Validating cart', { cartId });

      const cart = await this.getCart(cartId);
      const validation = {
        cart,
        isValid: true,
        issues: [],
        warnings: []
      };

      // Validate each item
      for (const item of cart.items) {
        try {
          // Check product availability
          const product = await this.getProductDetails(item.productId);
          
          if (!product.isActive) {
            validation.issues.push({
              type: 'PRODUCT_INACTIVE',
              productId: item.productId,
              message: 'Product is no longer available'
            });
            validation.isValid = false;
          }

          // Check price changes
          if (Math.abs(item.unitPrice - product.price) > 0.01) {
            validation.warnings.push({
              type: 'PRICE_CHANGE',
              productId: item.productId,
              oldPrice: item.unitPrice,
              newPrice: product.price,
              message: 'Product price has changed'
            });
          }

          // Check stock availability
          const stockAvailable = await this.checkStockAvailability(cart.storeId, item.productId);
          if (stockAvailable < item.quantity) {
            validation.issues.push({
              type: 'INSUFFICIENT_STOCK',
              productId: item.productId,
              requested: item.quantity,
              available: stockAvailable,
              message: `Only ${stockAvailable} items available`
            });
            validation.isValid = false;
          }

        } catch (error) {
          validation.issues.push({
            type: 'PRODUCT_ERROR',
            productId: item.productId,
            message: 'Unable to validate product'
          });
          validation.isValid = false;
        }
      }

      logger.info('Cart validation completed', {
        cartId,
        isValid: validation.isValid,
        issueCount: validation.issues.length,
        warningCount: validation.warnings.length,
        duration: timer.getDuration()
      });

      return validation;

    } catch (error) {
      logger.error('Error validating cart', {
        error: error.message,
        cartId,
        duration: timer.getDuration()
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'Failed to validate cart', 'CART_VALIDATION_FAILED');
    }
  }

  /**
   * Process cart checkout
   * 
   * @param {string} cartId - Cart ID
   * @param {Object} checkoutData - Checkout data
   * @param {Object} userInfo - User information
   * @returns {Promise<Object>} Checkout result
   */
  async checkout(cartId, checkoutData, userInfo) {
    const timer = logger.startTimer();
    
    try {
      logger.info('Processing cart checkout', {
        cartId,
        paymentMethod: checkoutData.paymentMethod,
        userId: userInfo?.id
      });

      // Load and validate cart
      const cart = await this.getCart(cartId);
      
      if (cart.items.length === 0) {
        throw new ApiError(400, 'Cannot checkout empty cart', 'EMPTY_CART');
      }

      // Validate cart contents
      const validation = await this.validateCart(cartId);
      if (!validation.isValid) {
        throw new ApiError(400, 'Cart validation failed', 'CART_VALIDATION_FAILED', {
          issues: validation.issues
        });
      }

      // Create sale through Sales Service
      const saleData = {
        storeId: cart.storeId,
        customerId: cart.customerId,
        items: cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: 0
        })),
        paymentMethod: checkoutData.paymentMethod,
        totalAmount: cart.totalAmount,
        taxAmount: cart.taxAmount,
        discountAmount: cart.discountAmount,
        notes: checkoutData.notes || `Cart checkout: ${cartId}`
      };

      const sale = await this.createSale(saleData, userInfo);

      // Mark cart as completed
      cart.status = 'COMPLETED';
      cart.completedAt = new Date().toISOString();
      cart.saleId = sale.id;
      cart.updatedAt = new Date().toISOString();

      await this.saveCart(cart);

      // Remove from customer's active carts
      if (cart.customerId) {
        await this.removeFromCustomerCarts(cart.customerId, cartId);
      }

      const result = {
        cart,
        sale,
        checkout: {
          paymentMethod: checkoutData.paymentMethod,
          completedAt: cart.completedAt
        }
      };

      logger.info('Cart checkout completed successfully', {
        cartId,
        saleId: sale.id,
        totalAmount: cart.totalAmount,
        duration: timer.getDuration()
      });

      return result;

    } catch (error) {
      logger.error('Error processing cart checkout', {
        error: error.message,
        cartId,
        paymentMethod: checkoutData.paymentMethod,
        duration: timer.getDuration()
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'Failed to process checkout', 'CHECKOUT_FAILED');
    }
  }

  /**
   * Get customer carts
   * 
   * @param {number} customerId - Customer ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Customer carts
   */
  async getCustomerCarts(customerId, filters = {}) {
    const timer = logger.startTimer();
    
    try {
      logger.info('Retrieving customer carts', {
        customerId,
        filters
      });

      const redis = getRedisClient();
      const cartIdsKey = `${this.CUSTOMER_CARTS_PREFIX}${customerId}`;
      const cartIds = await redis.smembers(cartIdsKey);

      const carts = [];
      
      for (const cartId of cartIds) {
        try {
          const cart = await this.loadCart(cartId);
          if (cart) {
            // Apply filters
            if (filters.status && cart.status !== filters.status) continue;
            if (filters.storeId && cart.storeId !== filters.storeId) continue;
            
            // Check expiration
            if (new Date(cart.expiresAt) < new Date()) {
              await this.deleteCart(cartId);
              continue;
            }

            carts.push(cart);
          }
        } catch (error) {
          logger.warn('Error loading customer cart', {
            cartId,
            customerId,
            error: error.message
          });
        }
      }

      logger.info('Customer carts retrieved successfully', {
        customerId,
        cartCount: carts.length,
        duration: timer.getDuration()
      });

      return carts;

    } catch (error) {
      logger.error('Error retrieving customer carts', {
        error: error.message,
        customerId,
        duration: timer.getDuration()
      });
      
      throw new ApiError(500, 'Failed to retrieve customer carts', 'CUSTOMER_CARTS_RETRIEVAL_FAILED');
    }
  }

  /**
   * Delete cart
   * 
   * @param {string} cartId - Cart ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteCart(cartId) {
    const timer = logger.startTimer();
    
    try {
      logger.info('Deleting cart', { cartId });

      const cart = await this.loadCart(cartId);
      
      if (!cart) {
        throw new ApiError(404, 'Cart not found', 'CART_NOT_FOUND');
      }

      const redis = getRedisClient();
      const cartKey = `${this.CART_PREFIX}${cartId}`;
      
      await redis.del(cartKey);

      // Remove from customer's cart list
      if (cart.customerId) {
        await this.removeFromCustomerCarts(cart.customerId, cartId);
      }

      logger.info('Cart deleted successfully', {
        cartId,
        storeId: cart.storeId,
        duration: timer.getDuration()
      });

      return {
        cartId,
        storeId: cart.storeId,
        deleted: true
      };

    } catch (error) {
      logger.error('Error deleting cart', {
        error: error.message,
        cartId,
        duration: timer.getDuration()
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'Failed to delete cart', 'CART_DELETION_FAILED');
    }
  }

  // === PRIVATE HELPER METHODS ===

  /**
   * Validate cart data
   */
  validateCartData(cartData) {
    if (!cartData.storeId) {
      throw new ApiError(400, 'Store ID is required', 'VALIDATION_ERROR');
    }

    if (typeof cartData.storeId !== 'number') {
      throw new ApiError(400, 'Store ID must be a number', 'VALIDATION_ERROR');
    }
  }

  /**
   * Validate item data
   */
  validateItemData(itemData) {
    const required = ['productId', 'quantity'];
    const missing = required.filter(field => !itemData[field]);
    
    if (missing.length > 0) {
      throw new ApiError(400, `Missing required fields: ${missing.join(', ')}`, 'VALIDATION_ERROR');
    }

    if (itemData.quantity <= 0) {
      throw new ApiError(400, 'Quantity must be greater than zero', 'VALIDATION_ERROR');
    }

    if (typeof itemData.productId !== 'number') {
      throw new ApiError(400, 'Product ID must be a number', 'VALIDATION_ERROR');
    }
  }

  /**
   * Load cart from Redis
   */
  async loadCart(cartId) {
    try {
      const redis = getRedisClient();
      const cartKey = `${this.CART_PREFIX}${cartId}`;
      const cartData = await redis.get(cartKey);
      
      return cartData ? JSON.parse(cartData) : null;
    } catch (error) {
      logger.error('Error loading cart from Redis', {
        cartId,
        error: error.message
      });
      throw new ApiError(500, 'Failed to load cart', 'CART_LOAD_FAILED');
    }
  }

  /**
   * Save cart to Redis
   */
  async saveCart(cart) {
    try {
      const redis = getRedisClient();
      const cartKey = `${this.CART_PREFIX}${cart.id}`;
      
      cart.updatedAt = new Date().toISOString();
      
      const ttl = Math.floor((new Date(cart.expiresAt) - new Date()) / 1000);
      
      if (ttl > 0) {
        await redis.setex(cartKey, ttl, JSON.stringify(cart));
      } else {
        await redis.set(cartKey, JSON.stringify(cart));
      }
    } catch (error) {
      logger.error('Error saving cart to Redis', {
        cartId: cart.id,
        error: error.message
      });
      throw new ApiError(500, 'Failed to save cart', 'CART_SAVE_FAILED');
    }
  }

  /**
   * Add cart to customer's cart list
   */
  async addToCustomerCarts(customerId, cartId) {
    try {
      const redis = getRedisClient();
      const cartIdsKey = `${this.CUSTOMER_CARTS_PREFIX}${customerId}`;
      await redis.sadd(cartIdsKey, cartId);
    } catch (error) {
      logger.warn('Error adding cart to customer list', {
        customerId,
        cartId,
        error: error.message
      });
    }
  }

  /**
   * Remove cart from customer's cart list
   */
  async removeFromCustomerCarts(customerId, cartId) {
    try {
      const redis = getRedisClient();
      const cartIdsKey = `${this.CUSTOMER_CARTS_PREFIX}${customerId}`;
      await redis.srem(cartIdsKey, cartId);
    } catch (error) {
      logger.warn('Error removing cart from customer list', {
        customerId,
        cartId,
        error: error.message
      });
    }
  }

  /**
   * Get product details from Product Service
   */
  async getProductDetails(productId) {
    try {
      const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001';
      const response = await axios.get(`${productServiceUrl}/api/products/${productId}`);
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get product details', {
        productId,
        error: error.message
      });
      throw new ApiError(400, 'Product not found or unavailable', 'PRODUCT_NOT_FOUND');
    }
  }

  /**
   * Validate stock availability
   */
  async validateStockAvailability(storeId, productId, quantity) {
    try {
      const stockServiceUrl = process.env.STOCK_SERVICE_URL || 'http://localhost:3003';
      const response = await axios.get(
        `${stockServiceUrl}/api/stock/product/${productId}/store/${storeId}`
      );
      
      const stock = response.data.data;
      
      if (stock.quantity < quantity) {
        throw new ApiError(400, 
          `Insufficient stock. Available: ${stock.quantity}, Requested: ${quantity}`, 
          'INSUFFICIENT_STOCK'
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      logger.warn('Could not validate stock availability', {
        storeId,
        productId,
        quantity,
        error: error.message
      });
      
      // Continue without stock validation if service is unavailable
    }
  }

  /**
   * Check stock availability
   */
  async checkStockAvailability(storeId, productId) {
    try {
      const stockServiceUrl = process.env.STOCK_SERVICE_URL || 'http://localhost:3003';
      const response = await axios.get(
        `${stockServiceUrl}/api/stock/product/${productId}/store/${storeId}`
      );
      
      return response.data.data.quantity;
    } catch (error) {
      logger.warn('Could not check stock availability', {
        storeId,
        productId,
        error: error.message
      });
      
      return 999; // Assume availability if service is unavailable
    }
  }

  /**
   * Enrich cart items with product details
   */
  async enrichCartItems(cart) {
    for (const item of cart.items) {
      try {
        const product = await this.getProductDetails(item.productId);
        item.product = {
          id: product.id,
          name: product.name,
          sku: product.sku,
          description: product.description,
          price: product.price,
          image: product.image
        };
      } catch (error) {
        logger.warn('Could not enrich cart item with product details', {
          cartId: cart.id,
          productId: item.productId,
          error: error.message
        });
        
        // Keep cart item without product details
        item.product = {
          id: item.productId,
          name: 'Product information unavailable',
          sku: 'N/A',
          price: item.unitPrice
        };
      }
    }
  }

  /**
   * Recalculate cart totals
   */
  async recalculateCartTotals(cart) {
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Calculate tax (15% - simplified)
    const taxRate = 0.15;
    cart.taxAmount = cart.subtotal * taxRate;
    
    // Calculate total
    cart.totalAmount = cart.subtotal + cart.taxAmount - (cart.discountAmount || 0);
    
    // Ensure total is not negative
    cart.totalAmount = Math.max(0, cart.totalAmount);
    
    cart.updatedAt = new Date().toISOString();
  }

  /**
   * Compare customizations
   */
  compareCustomizations(customizations1, customizations2) {
    if (!customizations1 && !customizations2) return true;
    if (!customizations1 || !customizations2) return false;
    
    return JSON.stringify(customizations1.sort()) === JSON.stringify(customizations2.sort());
  }

  /**
   * Validate discount code
   */
  async validateDiscountCode(discountCode, cart) {
    // Simplified discount validation
    // In a real implementation, this would connect to a discount/promotion service
    
    const validDiscounts = {
      'SAVE10': { type: 'percentage', value: 10, minAmount: 50 },
      'SAVE20': { type: 'percentage', value: 20, minAmount: 100 },
      'WELCOME': { type: 'fixed', value: 5, minAmount: 0 }
    };

    const discount = validDiscounts[discountCode.toUpperCase()];
    
    if (!discount) {
      throw new ApiError(400, 'Invalid discount code', 'INVALID_DISCOUNT_CODE');
    }

    if (cart.subtotal < discount.minAmount) {
      throw new ApiError(400, 
        `Minimum order amount of $${discount.minAmount} required for this discount`, 
        'DISCOUNT_MINIMUM_NOT_MET'
      );
    }

    let discountAmount;
    if (discount.type === 'percentage') {
      discountAmount = cart.subtotal * (discount.value / 100);
    } else {
      discountAmount = discount.value;
    }

    // Don't exceed subtotal
    discountAmount = Math.min(discountAmount, cart.subtotal);

    return {
      code: discountCode,
      type: discount.type,
      value: discount.value,
      amount: discountAmount
    };
  }

  /**
   * Create sale through Sales Service
   */
  async createSale(saleData, userInfo) {
    try {
      const salesServiceUrl = process.env.SALES_SERVICE_URL || 'http://localhost:3004';
      const response = await axios.post(`${salesServiceUrl}/api/sales`, saleData, {
        headers: {
          'Authorization': `Bearer ${userInfo.token}`, // Assuming token is available
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.data;
    } catch (error) {
      logger.error('Failed to create sale', {
        saleData,
        error: error.message
      });
      throw new ApiError(500, 'Failed to create sale', 'SALE_CREATION_FAILED');
    }
  }
}

export default new CartService();
