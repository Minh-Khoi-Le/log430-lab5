import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ProductDAO = {
  /**
   * Get All Products
   * 
   * Retrieves all products with their stock information.
   * Used by the maison mère interface.
   * 
   * @returns {Promise<Array>} - Promise resolving to array of products with their stock information
   */
  getAll: async () => {
    return prisma.product.findMany({
      include: { stocks: true }
    });
  },

  /**
   * Find All Products
   * 
   * Retrieves a paginated and optionally sorted list of products.
   * Includes related stock information for each product.
   * 
   * @param {Object} options - Query options
   * @param {number} [options.offset=0] - Number of records to skip
   * @param {number} [options.limit=10] - Maximum number of records to return
   * @param {string} [options.sort] - Field to sort by
   * @returns {Promise<Array>} - Promise resolving to array of products with their stock information
   */
  findAll: async ({ offset = 0, limit = 10, sort } = {}) => {
    return prisma.product.findMany({
      skip: offset,
      take: limit,
      orderBy: sort ? { [sort]: 'asc' } : undefined,
      include: { stocks: true }
    });
  },
  
  /**
   * Find Product by ID
   * 
   * Retrieves a single product by its ID.
   * Includes related stock information.
   * 
   * @param {number|string} id - Product ID
   * @returns {Promise<Object|null>} - Promise resolving to product object or null if not found
   */
  findById: async (id) => prisma.product.findUnique({ 
    where: { id: Number(id) }, 
    include: { stocks: true } 
  }),
  
  /**
   * Insert Product
   * 
   * Creates a new product in the database.
   * 
   * @param {Object} data - Product data
   * @returns {Promise<Object>} - Promise resolving to created product
   */
  insert: async (data) => prisma.product.create({ data }),
  
  /**
   * Insert Product with Default Stock
   * 
   * Creates a new product and initializes stock entries with quantity 0 for all stores.
   * This ensures that all stores have a stock record for the new product.
   * 
   * @param {Object} data - Product data
   * @returns {Promise<Object>} - Promise resolving to created product with stock information
   */
  insertWithDefaultStock: async (data) => {
    return prisma.$transaction(async (tx) => {
      // First, create the product
      const product = await tx.product.create({ data });
      
      // Then, get all stores
      const stores = await tx.store.findMany();
      
      // Create stock entries with quantity 0 for each store
      for (const store of stores) {
        await tx.stock.create({
          data: {
            productId: product.id,
            storeId: store.id,
            quantity: 0
          }
        });
      }
      
      // Return the product with its stock information
      return tx.product.findUnique({
        where: { id: product.id },
        include: { stocks: true }
      });
    });
  },
  
  /**
   * Update Product
   * 
   * Updates an existing product in the database.
   * Stocks field is excluded to prevent Prisma validation errors. (Can be modified after update in edit form)
   * 
   * @param {number|string} id - Product ID
   * @param {Object} data - Updated product data
   * @returns {Promise<Object>} - Promise resolving to updated product
   */
  update: async (id, data) => {
    // Extract all the fields, excluding stocks and any other fields that might cause validation errors
    const { 
      name, 
      price, 
      description 
    } = data;
    
    // Create a clean update object with only valid fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = price;
    if (description !== undefined) updateData.description = description;
    
    return prisma.product.update({ 
      where: { id: Number(id) }, 
      data: updateData,
      include: { stocks: true }
    });
  },
  
  /**
   * Delete Product
   * 
   * Deletes a product from the database.
   * First deletes all related stock records to prevent foreign key constraint violations.
   * 
   * @param {number|string} id - Product ID
   * @returns {Promise<Object>} - Promise resolving to deleted product
   */
  del: async (id) => {
    const numericId = Number(id);
    
    // Use a transaction to ensure both operations succeed or fail together
    return prisma.$transaction(async (tx) => {
      // First, delete all stock records associated with this product
      await tx.stock.deleteMany({
        where: { productId: numericId }
      });
      
      // Also need to delete any SaleLine records that reference this product
      await tx.saleLine.deleteMany({
        where: { productId: numericId }
      });
      
      // Finally, delete the product itself
      return tx.product.delete({
        where: { id: numericId }
      });
    });
  }
};

export default ProductDAO;
