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

import { 
  getDatabaseClient, 
  executeTransaction,
  logger,
  BaseError
} from '../../shared/index.js';

// Get shared database client
function getPrisma() {
  return getDatabaseClient('store-service');
}

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
          { address: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      // Get stores with pagination
      const [stores, total] = await Promise.all([
        getPrisma().store.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            address: true
          }
        }),
        getPrisma().store.count({ where })
      ]);
      
      return {
        stores,
        total
      };
    } catch (error) {
      console.error('Error fetching stores:', error);
      throw new BaseError('Failed to fetch stores', 500);
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
      const store = await getPrisma().store.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          address: true
        }
      });
      
      return store;
    } catch (error) {
      console.error('Error fetching store by ID:', error);
      throw new BaseError('Failed to fetch store', 500);
    }
  }
  
  /**
   * Create a new store
   * 
   * @param {Object} storeData - Store creation data
   * @param {string} storeData.name - Store name
   * @param {string} storeData.address - Store address
   * @returns {Promise<Object>} Created store
   */
  static async createStore(storeData) {
    try {
      // Check for duplicate store name
      const existingStore = await getPrisma().store.findFirst({
        where: {
          name: storeData.name
        }
      });
      
      if (existingStore) {
        throw new BaseError('A store with this name already exists', 409);
      }
      
      // Create the store
      const store = await getPrisma().store.create({
        data: {
          name: storeData.name,
          address: storeData.address || null
        },
        select: {
          id: true,
          name: true,
          address: true
        }
      });
      
      console.log(`New store created: ${store.name} (ID: ${store.id})`);
      return store;
    } catch (error) {
      if (error instanceof BaseError) {
        throw error;
      }
      console.error('Error creating store:', error);
      throw new BaseError('Failed to create store', 500);
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
      const existingStore = await getPrisma().store.findUnique({
        where: { id }
      });
      
      if (!existingStore) {
        return null;
      }
      
      // Check for duplicate name if name is being updated
      if (updateData.name && updateData.name !== existingStore.name) {
        const duplicateStore = await getPrisma().store.findFirst({
          where: {
            name: updateData.name,
            id: { not: id }
          }
        });
        
        if (duplicateStore) {
          throw new BaseError('A store with this name already exists', 409);
        }
      }
      
      // Filter updateData to only include valid fields
      const validFields = {};
      if (updateData.name) validFields.name = updateData.name;
      if (updateData.address !== undefined) validFields.address = updateData.address;
      
      // Update the store
      const store = await getPrisma().store.update({
        where: { id },
        data: validFields,
        select: {
          id: true,
          name: true,
          address: true
        }
      });
      
      console.log(`Store updated: ${store.name} (ID: ${store.id})`);
      return store;
    } catch (error) {
      if (error instanceof BaseError) {
        throw error;
      }
      console.error('Error updating store:', error);
      throw new BaseError('Failed to update store', 500);
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
      const existingStore = await getPrisma().store.findUnique({
        where: { id }
      });
      
      if (!existingStore) {
        return false;
      }
      
      // Check for dependencies (sales, stock, etc.)
      const [salesCount, stockCount] = await Promise.all([
        getPrisma().sale.count({ where: { storeId: id } }),
        getPrisma().stock.count({ where: { storeId: id } })
      ]);
      
      if (salesCount > 0 || stockCount > 0) {
        throw new BaseError('Cannot delete store with existing sales or stock records', 400);
      }
      
      // Delete the store
      await getPrisma().store.delete({
        where: { id }
      });
      
      console.log(`Store deleted: ${existingStore.name} (ID: ${id})`);
      return true;
    } catch (error) {
      if (error instanceof BaseError) {
        throw error;
      }
      console.error('Error deleting store:', error);
      throw new BaseError('Failed to delete store', 500);
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
      const store = await getPrisma().store.findUnique({
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
        getPrisma().sale.count({
          where: { storeId: id }
        }),
        
        // Total revenue
        getPrisma().sale.aggregate({
          where: { storeId: id },
          _sum: { total: true }
        }),
        
        // Number of different products in stock
        getPrisma().stock.count({
          where: { 
            storeId: id,
            quantity: { gt: 0 }
          }
        }),
        
        // Total stock quantity
        getPrisma().stock.aggregate({
          where: { storeId: id },
          _sum: { quantity: true }
        }),
        
        // Sales in the last 30 days
        getPrisma().sale.count({
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
      throw new BaseError('Failed to fetch store statistics', 500);
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
      const store = await getPrisma().store.findUnique({
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
