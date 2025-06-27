/**
 * Cart Service
 * 
 * Core business logic for shopping cart operations in the microservices architecture.
 * This service handles cart management, item operations, and checkout processing.
 * 
 * Features:
 * - Database-based cart persistence with Redis caching
 * - Integration with Product and Stock services
 * - Cart validation against stock levels and pricing
 * - Checkout processing with Sales service
 * - Cart expiration and cleanup policies
 * - Discount and promotion handling
 * 
 * @author Cart Service Team
 * @version 1.0.0
 */

import { 
  logger,
  BaseError 
} from '../../shared/index.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { CartDB } from '../utils/cart-db.js';

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
   * @param {number} cartData.userId - User ID (optional)
   * @param {Object} userInfo - User information
   * @returns {Promise<Object>} Created cart
   */
  async createCart(cartData, userInfo = null) {
    const timer = logger.startTimer();
    
    try {
      logger.info('Creating new cart', {
        userId: cartData.userId,
        userInfo: userInfo?.id
      });

      // Generate unique cart ID
      const cartId = uuidv4();

      // Create cart in database
      const cart = await CartDB.createCart({
        id: cartId,
        userId: cartData.userId || userInfo?.id || null
      });

      logger.info('Cart created successfully', {
        cartId: cart.id,
        userId: cart.userId
      });

      timer.done({ message: 'Cart creation completed' });
      return cart;
    } catch (error) {
      timer.done({ message: 'Cart creation failed' });
      logger.error('Error creating cart', { error: error.message });
      throw new BaseError('Cart creation failed', 500, error);
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
      const cart = await CartDB.getCart(cartId);
      
      if (!cart) {
        throw new BaseError('Cart not found', 404);
      }

      logger.info('Cart retrieved successfully', {
        cartId,
        itemCount: cart.items.length
      });

      timer.done({ message: 'Cart retrieval completed' });
      return cart;
    } catch (error) {
      timer.done({ message: 'Cart retrieval failed' });
      logger.error('Error retrieving cart', { cartId, error: error.message });
      throw error;
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

      // Validate stock availability
      await this.validateStockAvailability(cart.storeId, itemData.productId, itemData.quantity);

      // Add item using CartDB
      await CartDB.addItemToCart(cartId, itemData.productId, itemData.quantity);

      // Get updated cart
      const updatedCart = await this.getCart(cartId);

      logger.info('Item added to cart successfully', {
        cartId,
        productId: itemData.productId,
        quantity: itemData.quantity
      });

      return updatedCart;

    } catch (error) {
      logger.error('Error adding item to cart', {
        error: error.message,
        cartId,
        productId: itemData.productId
      });
      
      if (error instanceof BaseError) {
        throw error;
      }
      
      throw new BaseError('Failed to add item to cart', 500, error);
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
    try {
      logger.info('Updating cart item', {
        cartId,
        productId,
        quantity
      });

      if (quantity < 0) {
        throw new BaseError('Quantity cannot be negative', 400);
      }

      // Validate stock availability for new quantity
      if (quantity > 0) {
        await this.validateStockAvailability(null, productId, quantity);
      }

      // Update item using CartDB
      await CartDB.updateCartItem(cartId, productId, quantity);

      // Get updated cart
      const updatedCart = await this.getCart(cartId);

      logger.info('Cart item updated successfully', {
        cartId,
        productId,
        quantity
      });

      return updatedCart;

    } catch (error) {
      logger.error('Error updating cart item', {
        error: error.message,
        cartId,
        productId
      });
      
      if (error instanceof BaseError) {
        throw error;
      }
      
      throw new BaseError('Failed to update cart item', 500, error);
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
    try {
      logger.info('Clearing cart', { cartId });

      // Clear cart using CartDB
      await CartDB.clearCart(cartId);

      // Get updated cart
      const updatedCart = await this.getCart(cartId);

      logger.info('Cart cleared successfully', { cartId });

      return updatedCart;

    } catch (error) {
      logger.error('Error clearing cart', {
        error: error.message,
        cartId
      });
      
      if (error instanceof BaseError) {
        throw error;
      }
      
      throw new BaseError('Failed to clear cart', 500, error);
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
      
      if (error instanceof BaseError) {
        throw error;
      }
      
      throw new BaseError('Failed to apply discount', 500, error);
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
      
      if (error instanceof BaseError) {
        throw error;
      }
      
      throw new BaseError('Failed to validate cart', 500, error);
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
        throw new BaseError('Cannot checkout empty cart', 400);
      }

      // Validate cart contents
      const validation = await this.validateCart(cartId);
      if (!validation.isValid) {
        throw new BaseError('Cart validation failed', 400, validation.issues);
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
      
      if (error instanceof BaseError) {
        throw error;
      }
      
      throw new BaseError('Failed to process checkout', 500, error);
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
      
      throw new BaseError('Failed to retrieve customer carts', 500);
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
        throw new BaseError('Cart not found', 404);
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
      
      if (error instanceof BaseError) {
        throw error;
      }
      
      throw new BaseError('Failed to delete cart', 500, error);
    }
  }

  // === PRIVATE HELPER METHODS ===

  /**
   * Validate cart data
   */
  validateCartData(cartData) {
    if (!cartData.storeId) {
      throw new BaseError('Store ID is required', 400);
    }

    if (typeof cartData.storeId !== 'number') {
      throw new BaseError('Store ID must be a number', 400);
    }
  }

  /**
   * Validate item data
   */
  validateItemData(itemData) {
    const required = ['productId', 'quantity'];
    const missing = required.filter(field => !itemData[field]);
    
    if (missing.length > 0) {
      throw new BaseError(`Missing required fields: ${missing.join(', ')}`, 400);
    }

    if (itemData.quantity <= 0) {
      throw new BaseError('Quantity must be greater than zero', 400);
    }

    if (typeof itemData.productId !== 'number') {
      throw new BaseError('Product ID must be a number', 400);
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
      throw new BaseError('Failed to load cart', 500);
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
      throw new BaseError('Failed to save cart', 500);
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
      throw new BaseError('Product not found or unavailable', 400);
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
        throw new BaseError(
          `Insufficient stock. Available: ${stock.quantity}, Requested: ${quantity}`, 
          400
        );
      }
    } catch (error) {
      if (error instanceof BaseError) {
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
      throw new BaseError('Invalid discount code', 400);
    }

    if (cart.subtotal < discount.minAmount) {
      throw new BaseError(
        `Minimum order amount of $${discount.minAmount} required for this discount`, 
        400
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
      throw new BaseError('Failed to create sale', 500);
    }
  }
}

export default new CartService();
