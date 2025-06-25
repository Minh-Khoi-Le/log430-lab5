/**
 * Store Service Business Logic
 * 
 * This service handles the core business logic for store management operations.
 * It provides a clean interface between controllers and data access layers,
 * implementing business rules and validation logic.
 * 
 * Features:
 * - Store CRUD operations with business validation
 * - Statistics and analytics for stores
 * - Data consistency and integrity checks
 * - Integration with external services (stock, sales)
 * 
 * @author Store Service Team
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

/**
 * Store Service Class
 * 
 * Encapsulates all store-related business logic and data operations.
 * Provides methods for managing stores with proper validation and error handling.
 */
class StoreService {
  
  /**
   * Get all stores with pagination and filtering
   * 
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (1-based)
   * @param {number} options.limit - Items per page
   * @param {string} options.search - Search term for filtering
   * @returns {Promise<{stores: Array, total: number}>} Paginated stores and total count
   */
  static async getAllStores({ page = 1, limit = 10, search }) {
    try {
      const skip = (page - 1) * limit;
      
      // Build where clause for filtering
      const where = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      // Get stores with pagination
      const [stores, total] = await Promise.all([
        prisma.store.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            phone: true,
            email: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        prisma.store.count({ where })
      ]);
      
      return {
        stores,
        total
      };
    } catch (error) {
      console.error('Error fetching stores:', error);
      throw new ApiError(500, 'Failed to fetch stores');
    }
  }
  
  /**
   * Get store by ID with detailed information
   * 
   * @param {number} id - Store ID
   * @returns {Promise<Object|null>} Store details or null if not found
   */
  static async getStoreById(id) {
    try {
      const store = await prisma.store.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          phone: true,
          email: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      return store;
    } catch (error) {
      console.error('Error fetching store by ID:', error);
      throw new ApiError(500, 'Failed to fetch store');
    }
  }
  
  /**
   * Create a new store
   * 
   * @param {Object} storeData - Store creation data
   * @param {string} storeData.name - Store name
   * @param {string} storeData.address - Store address
   * @param {string} storeData.city - Store city
   * @param {string} [storeData.phone] - Store phone number
   * @param {string} [storeData.email] - Store email
   * @returns {Promise<Object>} Created store
   */
  static async createStore(storeData) {
    try {
      // Check for duplicate store name in the same city
      const existingStore = await prisma.store.findFirst({
        where: {
          name: storeData.name,
          city: storeData.city
        }
      });
      
      if (existingStore) {
        throw new ApiError(409, 'A store with this name already exists in this city');
      }
      
      // Create the store
      const store = await prisma.store.create({
        data: {
          name: storeData.name,
          address: storeData.address,
          city: storeData.city,
          phone: storeData.phone || null,
          email: storeData.email || null
        },
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          phone: true,
          email: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      console.log(`New store created: ${store.name} (ID: ${store.id})`);
      return store;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Error creating store:', error);
      throw new ApiError(500, 'Failed to create store');
    }
  }
  
  /**
   * Update an existing store
   * 
   * @param {number} id - Store ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object|null>} Updated store or null if not found
   */
  static async updateStore(id, updateData) {
    try {
      // Check if store exists
      const existingStore = await prisma.store.findUnique({
        where: { id }
      });
      
      if (!existingStore) {
        return null;
      }
      
      // Check for duplicate name if name is being updated
      if (updateData.name && updateData.name !== existingStore.name) {
        const duplicateStore = await prisma.store.findFirst({
          where: {
            name: updateData.name,
            city: updateData.city || existingStore.city,
            id: { not: id }
          }
        });
        
        if (duplicateStore) {
          throw new ApiError(409, 'A store with this name already exists in this city');
        }
      }
      
      // Update the store
      const store = await prisma.store.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          phone: true,
          email: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      console.log(`Store updated: ${store.name} (ID: ${store.id})`);
      return store;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Error updating store:', error);
      throw new ApiError(500, 'Failed to update store');
    }
  }
  
  /**
   * Delete a store
   * 
   * @param {number} id - Store ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  static async deleteStore(id) {
    try {
      // Check if store exists
      const existingStore = await prisma.store.findUnique({
        where: { id }
      });
      
      if (!existingStore) {
        return false;
      }
      
      // Check for dependencies (sales, stock, etc.)
      const [salesCount, stockCount] = await Promise.all([
        prisma.sale.count({ where: { storeId: id } }),
        prisma.stock.count({ where: { storeId: id } })
      ]);
      
      if (salesCount > 0 || stockCount > 0) {
        throw new ApiError(400, 'Cannot delete store with existing sales or stock records');
      }
      
      // Delete the store
      await prisma.store.delete({
        where: { id }
      });
      
      console.log(`Store deleted: ${existingStore.name} (ID: ${id})`);
      return true;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Error deleting store:', error);
      throw new ApiError(500, 'Failed to delete store');
    }
  }
  
  /**
   * Get store statistics and performance data
   * 
   * @param {number} id - Store ID
   * @returns {Promise<Object|null>} Store statistics or null if not found
   */
  static async getStoreStats(id) {
    try {
      // Check if store exists
      const store = await prisma.store.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          city: true
        }
      });
      
      if (!store) {
        return null;
      }
      
      // Get various statistics
      const [
        totalSales,
        totalRevenue,
        totalProducts,
        totalStock,
        recentSalesCount
      ] = await Promise.all([
        // Total number of sales
        prisma.sale.count({
          where: { storeId: id }
        }),
        
        // Total revenue
        prisma.sale.aggregate({
          where: { storeId: id },
          _sum: { total: true }
        }),
        
        // Number of different products in stock
        prisma.stock.count({
          where: { 
            storeId: id,
            quantity: { gt: 0 }
          }
        }),
        
        // Total stock quantity
        prisma.stock.aggregate({
          where: { storeId: id },
          _sum: { quantity: true }
        }),
        
        // Sales in the last 30 days
        prisma.sale.count({
          where: {
            storeId: id,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);
      
      return {
        store,
        statistics: {
          totalSales,
          totalRevenue: totalRevenue._sum.total || 0,
          totalProducts,
          totalStock: totalStock._sum.quantity || 0,
          recentSalesCount,
          averageSaleValue: totalSales > 0 ? (totalRevenue._sum.total || 0) / totalSales : 0
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching store statistics:', error);
      throw new ApiError(500, 'Failed to fetch store statistics');
    }
  }
  
  /**
   * Check if a store exists
   * 
   * @param {number} id - Store ID
   * @returns {Promise<boolean>} True if store exists
   */
  static async storeExists(id) {
    try {
      const store = await prisma.store.findUnique({
        where: { id },
        select: { id: true }
      });
      
      return !!store;
    } catch (error) {
      console.error('Error checking store existence:', error);
      return false;
    }
  }
}

export default StoreService;
