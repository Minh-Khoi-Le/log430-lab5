/**
 * Cart Service Database Helper
 * 
 * Provides cart-specific database operations using the shared database client.
 * This helper encapsulates all cart-related database queries and transactions.
 */

import { getDatabaseClient, DatabaseUtils, executeTransaction } from '../../shared/index.js';

// Get the shared database client for cart service
function getPrisma() {
  return getDatabaseClient('cart-service');
}

/**
 * Cart Database Operations
 */
export const CartDB = {
  /**
   * Create a new cart in the database
   */
  async createCart(cartData) {
    try {
      const prisma = getPrisma();
      
      return await prisma.cart.create({
        data: {
          id: cartData.id,
          userId: cartData.userId || null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          items: {
            include: {
              product: true
            }
          },
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    } catch (error) {
      DatabaseUtils.handlePrismaError(error, 'cart-service');
    }
  },

  /**
   * Get cart by ID
   */
  async getCart(cartId) {
    try {
      const prisma = getPrisma();
      
      return await prisma.cart.findUnique({
        where: { id: cartId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  description: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    } catch (error) {
      DatabaseUtils.handlePrismaError(error, 'cart-service');
    }
  },

  /**
   * Add item to cart
   */
  async addItemToCart(cartId, productId, quantity) {
    try {
      return await executeTransaction(async (prisma) => {
        // Check if item already exists in cart
        const existingItem = await prisma.cartItem.findFirst({
          where: {
            cartId: cartId,
            productId: productId
          }
        });

        if (existingItem) {
          // Update quantity
          return await prisma.cartItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: existingItem.quantity + quantity
            },
            include: {
              product: true
            }
          });
        } else {
          // Create new cart item
          return await prisma.cartItem.create({
            data: {
              cartId: cartId,
              productId: productId,
              quantity: quantity
            },
            include: {
              product: true
            }
          });
        }
      }, 'cart-service');
    } catch (error) {
      DatabaseUtils.handlePrismaError(error, 'cart-service');
    }
  },

  /**
   * Update item quantity in cart
   */
  async updateCartItem(cartId, productId, quantity) {
    try {
      const prisma = getPrisma();
      
      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        return await prisma.cartItem.deleteMany({
          where: {
            cartId: cartId,
            productId: productId
          }
        });
      } else {
        // Update quantity
        return await prisma.cartItem.updateMany({
          where: {
            cartId: cartId,
            productId: productId
          },
          data: {
            quantity: quantity
          }
        });
      }
    } catch (error) {
      DatabaseUtils.handlePrismaError(error, 'cart-service');
    }
  },

  /**
   * Remove item from cart
   */
  async removeItemFromCart(cartId, productId) {
    try {
      const prisma = getPrisma();
      
      return await prisma.cartItem.deleteMany({
        where: {
          cartId: cartId,
          productId: productId
        }
      });
    } catch (error) {
      DatabaseUtils.handlePrismaError(error, 'cart-service');
    }
  },

  /**
   * Clear all items from cart
   */
  async clearCart(cartId) {
    try {
      const prisma = getPrisma();
      
      return await prisma.cartItem.deleteMany({
        where: {
          cartId: cartId
        }
      });
    } catch (error) {
      DatabaseUtils.handlePrismaError(error, 'cart-service');
    }
  },

  /**
   * Delete cart completely
   */
  async deleteCart(cartId) {
    try {
      return await executeTransaction(async (prisma) => {
        // Delete all cart items first
        await prisma.cartItem.deleteMany({
          where: { cartId: cartId }
        });

        // Delete the cart
        return await prisma.cart.delete({
          where: { id: cartId }
        });
      }, 'cart-service');
    } catch (error) {
      DatabaseUtils.handlePrismaError(error, 'cart-service');
    }
  },

  /**
   * Get user's carts
   */
  async getUserCarts(userId, options = {}) {
    try {
      const prisma = getPrisma();
      const { page = 1, size = 10 } = options;
      const offset = (page - 1) * size;

      const [carts, total] = await Promise.all([
        prisma.cart.findMany({
          where: {
            userId: userId
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    price: true
                  }
                }
              }
            }
          },
          skip: offset,
          take: size,
          orderBy: {
            updatedAt: 'desc'
          }
        }),
        prisma.cart.count({
          where: {
            userId: userId
          }
        })
      ]);

      return {
        carts,
        pagination: DatabaseUtils.buildPaginationMetadata(page, size, total)
      };
    } catch (error) {
      DatabaseUtils.handlePrismaError(error, 'cart-service');
    }
  },

  /**
   * Update cart timestamp
   */
  async updateCartTimestamp(cartId) {
    try {
      const prisma = getPrisma();
      
      return await prisma.cart.update({
        where: { id: cartId },
        data: {
          updatedAt: new Date()
        }
      });
    } catch (error) {
      DatabaseUtils.handlePrismaError(error, 'cart-service');
    }
  }
};
