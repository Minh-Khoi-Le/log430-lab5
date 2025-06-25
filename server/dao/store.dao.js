import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const StoreDAO = {
  /**
   * Create Store
   * 
   * Creates a new store in the database.
   * 
   * @param {Object} data - Store data
   * @param {string} data.name - Store name
   * @param {string} [data.address] - Store address (optional)
   * @returns {Promise<Object>} - Promise resolving to created store
   */
  create: async (data) => prisma.store.create({ data }),
  
  /**
   * Create Store with Default Stock
   * 
   * Creates a new store and initializes stock entries with quantity 0 for all existing products.
   * This ensures that the new store has stock records for all products.
   * 
   * @param {Object} data - Store data
   * @param {string} data.name - Store name
   * @param {string} [data.address] - Store address (optional)
   * @returns {Promise<Object>} - Promise resolving to created store with stock information
   */
  createWithDefaultStock: async (data) => {
    return prisma.$transaction(async (tx) => {
      // First, create the store
      const store = await tx.store.create({ data });
      
      // Then, get all existing products
      const products = await tx.product.findMany();
      
      // Create stock entries with quantity 0 for each product
      for (const product of products) {
        await tx.stock.create({
          data: {
            storeId: store.id,
            productId: product.id,
            quantity: 0
          }
        });
      }
      
      // Return the store with its stock information
      return tx.store.findUnique({
        where: { id: store.id },
        include: { stocks: { include: { product: true } } }
      });
    });
  },
  
  /**
   * Get Store by ID
   * 
   * Retrieves a single store by its ID.
   * 
   * @param {number|string} id - Store ID
   * @returns {Promise<Object|null>} - Promise resolving to store object or null if not found
   */
  getById: async (id) => prisma.store.findUnique({ where: { id: parseInt(id) } }),
  
  /**
   * Get All Stores
   * 
   * Retrieves all stores from the database.
   * 
   * @returns {Promise<Array>} - Promise resolving to array of stores
   */
  getAll: async () => prisma.store.findMany(),
  
  /**
   * Update Store
   * 
   * Updates an existing store in the database.
   * 
   * @param {number|string} id - Store ID
   * @param {Object} data - Updated store data
   * @param {string} [data.name] - Store name
   * @param {string} [data.address] - Store address
   * @returns {Promise<Object>} - Promise resolving to updated store
   */
  update: async (id, data) => prisma.store.update({ where: { id: parseInt(id) }, data }),
  
  /**
   * Delete Store
   * 
   * Deletes a store from the database.
   * 
   * @param {number|string} id - Store ID
   * @returns {Promise<Object>} - Promise resolving to deleted store
   */
  delete: async (id) => prisma.store.delete({ where: { id: parseInt(id) } }),
};

export default StoreDAO;