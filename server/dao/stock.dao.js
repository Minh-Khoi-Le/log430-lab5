import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const StockDAO = {
  /**
   * Get Stock by Store
   * 
   * Retrieves all inventory stock records for a specific store.
   * Includes detailed product information for each stock record.
   * 
   * This function is used to:
   * - Display current inventory levels in Dashboard
   * - Check product availability for sales
   * - Identify products that need restocking
   * 
   * @param {number|string} storeId - Store ID
   * @returns {Promise<Array>} - Promise resolving to array of stock records with product details
   */
  getStockByStore: async (storeId) =>
    prisma.stock.findMany({
      where: { storeId: parseInt(storeId) },
      include: { product: true },
    }),
    
  /**
   * Update Stock Quantity
   * 
   * Updates the stock quantity for a spec ific product in a specific store.
   * Creates a new stock record if one doesn't exist.
   * 
   * @param {number|string} productId - Product ID
   * @param {number|string} storeId - Store ID
   * @param {number} quantity - New stock quantity
   * @returns {Promise<Object>} - Promise resolving to the updated stock record
   */
  updateStock: async (productId, storeId, quantity) => {
    const numericProductId = parseInt(productId);
    const numericStoreId = parseInt(storeId);
    const numericQuantity = parseInt(quantity);
    
    return prisma.stock.upsert({
      where: {
        storeId_productId: {
          storeId: numericStoreId,
          productId: numericProductId
        }
      },
      update: { quantity: numericQuantity },
      create: {
        storeId: numericStoreId,
        productId: numericProductId,
        quantity: numericQuantity
      }
    });
  },
  
  /**
   * Get Stock by Product
   * 
   * Retrieves all stock records for a specific product across all stores.
   * 
   * @param {number|string} productId - Product ID
   * @returns {Promise<Array>} - Promise resolving to array of stock records
   */
  getStockByProduct: async (productId) =>
    prisma.stock.findMany({
      where: { productId: parseInt(productId) },
      include: { store: true }
    })
};

export default StockDAO;
