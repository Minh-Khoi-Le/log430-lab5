import SaleDAO   from '../dao/sale.dao.js';
import { PrismaClient } from '@prisma/client';
import invalidateCache from '../utils/cacheInvalidation.js';
const prisma = new PrismaClient();

/**
 * Create Sale Controller
 * Creates a new sale transaction with the provided data.
 * @param {Request} req - Express request object with sale data in body
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function create(req, res, next) {
  try {
    let { storeId, userId, lines, clientName, cart } = req.body;

    // If userId is not provided, use clientName to find the user
    if (!userId && clientName) {
      let user = await prisma.user.findFirst({ where: { name: clientName } });
      if (!user) {
        return res.status(400).json({ error: "User not found" });
      }
      userId = user.id;
    }

    // If lines is not provided, convert cart to lines
    if (!lines && cart) {
      lines = cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price
      }));
    }

    if (!storeId || !userId || !lines) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if storeId exists
    const store = await prisma.store.findUnique({ where: { id: parseInt(storeId) } });
    if (!store) {
      return res.status(400).json({ error: "The selected store does not exist." });
    }

    // Check stock availability for each product
    for (const line of lines) {
      const stock = await prisma.stock.findFirst({
        where: { 
          productId: parseInt(line.productId), 
          storeId: parseInt(storeId) 
        }
      });
      
      if (!stock || stock.quantity < line.quantity) {
        const product = await prisma.product.findUnique({ 
          where: { id: parseInt(line.productId) } 
        });
        return res.status(400).json({ 
          error: `Insufficient stock for ${product ? product.name : 'a product'}`
        });
      }
    }

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Calculate total
      const total = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
      
      // Create the sale
      const sale = await tx.sale.create({
        data: {
          storeId: parseInt(storeId),
          userId: parseInt(userId),
          total: parseFloat(total),
          lines: {
            create: lines.map(line => ({
              productId: parseInt(line.productId),
              quantity: parseInt(line.quantity),
              unitPrice: parseFloat(line.unitPrice)
            }))
          }
        },
        include: { lines: true }
      });
      
      // Update stock quantities
      for (const line of lines) {
        await tx.stock.updateMany({
          where: { 
            productId: parseInt(line.productId), 
            storeId: parseInt(storeId) 
          },
          data: { 
            quantity: { 
              decrement: parseInt(line.quantity) 
            } 
          }
        });
      }
      
      return sale;
    });

    res.status(201).json({ success: true, sale: result });
  } catch (err) {
    next(err);
  }
}

/**
 * List Sales Controller
 * 
 * Retrieves a list of all sales with client and store information.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function list(req, res, next) {
  try {
    const sales = await SaleDAO.getAll();
    res.json(sales);
  } catch (err) { next(err); }
}

/**
 * Get Client Sales Controller
 * 
 * Retrieves all sales for a specific client.
 * 
 * @param {Request} req - Express request object with client ID parameter
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function byClient(req, res, next) {
  try {
    // Use client ID from either path parameter or request body
    const clientId = req.params.clientId || req.body.userId;
    
    if (!clientId) {
      return res.status(400).json({ error: "Client ID is required" });
    }
    
    const sales = await SaleDAO.getByUser(clientId);
    res.json(sales);
  } catch (err) { next(err); }
}

/**
 * Get Store Sales Controller
 * 
 * Retrieves all sales for a specific store with detailed information,
 * including product details, client information, and line items.
 * Optionally limits the results to a specific count.
 * 
 * @param {Request} req - Express request object with store ID parameter
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function byStore(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
    const sales = await SaleDAO.getByStore(req.params.storeId, limit);
    res.json(sales);
  } catch (err) { next(err); }
}

/**
 * Refund Sale Controller
 * 
 * Refunds a sale by adding products back to stock and removing the sale.
 * 
 * @param {Request} req - Express request object with sale ID parameter
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function refund(req, res, next) {
  try {
    const { saleId } = req.body;
    
    if (!saleId) {
      return res.status(400).json({ error: "Sale ID is required" });
    }

    // Find the sale with all its details
    const sale = await prisma.sale.findUnique({
      where: { id: parseInt(saleId) },
      include: { 
        lines: true,
        store: true,
        user: true
      }
    });
    
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    // Execute refund in a transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Return stock for each product in the sale
      for (const line of sale.lines) {
        await tx.stock.updateMany({
          where: { 
            productId: parseInt(line.productId), 
            storeId: parseInt(sale.storeId)
          },
          data: { 
            quantity: { 
              increment: parseInt(line.quantity)
            } 
          }
        });
      }
      
      // Delete the sale lines first (due to foreign key constraints)
      await tx.saleLine.deleteMany({
        where: { saleId: sale.id }
      });
      
      // Delete the sale
      const deletedSale = await tx.sale.delete({
        where: { id: sale.id }
      });
      
      return deletedSale;
    });

    // Invalidate stock cache after refund
    await invalidateCache.stock();

    res.status(200).json({ 
      success: true, 
      message: "Refund processed successfully",
      refundedSale: result
    });
  } catch (err) {
    console.error("Refund error:", err);
    next(err);
  }
} 