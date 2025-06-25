import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const RefundDAO = {
  /**
   * Create Refund
   * 
   * Creates a new refund transaction in the database with associated line items.
   * Updates the sale status and returns products to inventory.
   * 
   * @param {Object} refundData - Refund transaction data
   * @param {number|string} refundData.saleId - Original sale ID
   * @param {number|string} refundData.storeId - Store ID where the refund is processed
   * @param {number|string} refundData.userId - User ID requesting the refund
   * @param {string} [refundData.reason] - Optional reason for the refund
   * @param {Array} refundData.lines - Array of refunded items
   * @param {number} refundData.total - Total refund amount
   * @returns {Promise<Object>} - Promise resolving to created refund with line items
   */
  create: async ({ saleId, storeId, userId, lines, total, reason }) => {
    // Process refund in a transaction to ensure data consistency
    return prisma.$transaction(async (tx) => {
      // Create the refund record
      const refund = await tx.refund.create({
        data: {
          saleId: parseInt(saleId),
          storeId: parseInt(storeId),
          userId: parseInt(userId),
          total: parseFloat(total),
          reason,
          lines: {
            create: lines.map(line => ({
              productId: parseInt(line.productId),
              quantity: parseInt(line.quantity),
              unitPrice: parseFloat(line.unitPrice)
            }))
          }
        },
        include: { 
          lines: { include: { product: true } },
          sale: true,
          user: true,
          store: true
        }
      });
      
      // Update the original sale status (to either 'refunded' or 'partially_refunded')
      const originalSale = await tx.sale.findUnique({
        where: { id: parseInt(saleId) },
        include: { lines: true }
      });
      
      // Calculate how much of the sale is being refunded
      const refundTotal = parseFloat(total);
      const saleTotal = originalSale.total;
      const isFullRefund = Math.abs(refundTotal - saleTotal) < 0.01; // Allow for small rounding differences
      
      await tx.sale.update({
        where: { id: parseInt(saleId) },
        data: { status: isFullRefund ? 'refunded' : 'partially_refunded' }
      });
      
      // Return products to stock
      for (const line of lines) {
        await tx.stock.updateMany({
          where: { 
            productId: parseInt(line.productId), 
            storeId: parseInt(storeId) 
          },
          data: { 
            quantity: { increment: parseInt(line.quantity) } 
          }
        });
      }
      
      return refund;
    });
  },
  
  /**
   * Get Refunds by User
   * 
   * Retrieves all refunds for a specific user (client).
   * 
   * @param {number|string} userId - User ID
   * @returns {Promise<Array>} - Promise resolving to array of user's refunds
   */
  getByUser: async (userId) => 
    prisma.refund.findMany({
      where: { userId: parseInt(userId) },
      include: { 
        lines: { include: { product: true } },
        sale: true,
        store: true
      },
      orderBy: { date: 'desc' }
    }),
  
  /**
   * Get Refunds by Sale
   * 
   * Retrieves all refunds for a specific sale.
   * 
   * @param {number|string} saleId - Sale ID
   * @returns {Promise<Array>} - Promise resolving to array of refunds for the sale
   */
  getBySale: async (saleId) =>
    prisma.refund.findMany({
      where: { saleId: parseInt(saleId) },
      include: { 
        lines: { include: { product: true } },
        user: true,
        store: true
      }
    }),
  
  /**
   * Get Refunds by Store
   * 
   * Retrieves all refunds processed at a specific store.
   * 
   * @param {number|string} storeId - Store ID
   * @param {number} [limit] - Optional limit on number of refunds to return
   * @returns {Promise<Array>} - Promise resolving to array of store's refunds
   */
  getByStore: async (storeId, limit) => {
    const query = {
      where: { storeId: parseInt(storeId) },
      include: { 
        lines: { include: { product: true } }, 
        user: true,
        sale: true
      },
      orderBy: { date: 'desc' }
    };
    
    if (limit) {
      query.take = limit;
    }
    
    return prisma.refund.findMany(query);
  },
  
  /**
   * Get All Refunds
   * 
   * Retrieves all refunds with user, sale, and store information.
   * 
   * @returns {Promise<Array>} - Promise resolving to array of all refunds
   */
  getAll: async () => 
    prisma.refund.findMany({ 
      include: { 
        user: true, 
        sale: true, 
        store: true,
        lines: { include: { product: true } }
      },
      orderBy: { date: 'desc' }
    }),
};

export default RefundDAO; 