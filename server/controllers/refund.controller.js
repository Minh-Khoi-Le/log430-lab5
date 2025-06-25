import RefundDAO from '../dao/refund.dao.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Create Refund Controller
 * 
 * Handles the creation of a new refund for a sale.
 * Validates input, creates the refund, updates the sale status,
 * and handles returning products to inventory.
 * 
 * @param {Request} req - Express request object with refund data in body
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function create(req, res, next) {
  try {
    const { saleId, reason, items, userId, storeId } = req.body;
    
    // Validate required fields
    if (!saleId) {
      return res.status(400).json({ error: "Sale ID is required" });
    }
    
    // Find the sale to refund
    const sale = await prisma.sale.findUnique({
      where: { id: parseInt(saleId) },
      include: { 
        lines: { include: { product: true } },
        store: true,
        user: true
      }
    });
    
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }
    
    // Check if already refunded
    if (sale.status === 'refunded') {
      return res.status(400).json({ error: "This sale has already been refunded" });
    }
    
    // If no specific items were selected for refund, refund all items
    const refundItems = items || sale.lines.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice
    }));
    
    // Calculate refund total
    const refundTotal = refundItems.reduce(
      (sum, item) => sum + (item.quantity * item.unitPrice), 
      0
    );
    
    // Create the refund using the DAO
    const refund = await RefundDAO.create({
      saleId: saleId,
      storeId: storeId || sale.storeId,
      userId: userId || sale.userId,
      lines: refundItems,
      total: refundTotal,
      reason
    });
    
    res.status(201).json({
      success: true,
      message: "Refund processed successfully",
      refund
    });
  } catch (err) {
    console.error("Refund error:", err);
    next(err);
  }
}

/**
 * Get Refund History Controller
 * 
 * Retrieves refund history for a specific user.
 * 
 * @param {Request} req - Express request object with user ID in body
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function getByUser(req, res, next) {
  try {
    const userId = req.params.userId || req.body.userId;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    const refunds = await RefundDAO.getByUser(userId);
    res.json(refunds);
  } catch (err) {
    next(err);
  }
}

/**
 * Get All Refunds Controller
 * 
 * Retrieves all refunds in the system.
 * Intended for administrative purposes.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function list(req, res, next) {
  try {
    const refunds = await RefundDAO.getAll();
    res.json(refunds);
  } catch (err) {
    next(err);
  }
}

/**
 * Get Refunds by Sale Controller
 * 
 * Retrieves all refunds associated with a specific sale.
 * 
 * @param {Request} req - Express request object with sale ID parameter
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function getBySale(req, res, next) {
  try {
    const saleId = req.params.saleId;
    
    if (!saleId) {
      return res.status(400).json({ error: "Sale ID is required" });
    }
    
    const refunds = await RefundDAO.getBySale(saleId);
    res.json(refunds);
  } catch (err) {
    next(err);
  }
}

/**
 * Get Refunds by Store Controller
 * 
 * Retrieves refunds processed at a specific store.
 * Optionally limits the number of results returned.
 * 
 * @param {Request} req - Express request object with store ID parameter
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function byStore(req, res, next) {
  try {
    const { storeId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
    
    if (!storeId) {
      return res.status(400).json({ error: "Store ID is required" });
    }
    
    const refunds = await RefundDAO.getByStore(storeId, limit);
    res.json(refunds);
  } catch (err) {
    next(err);
  }
} 