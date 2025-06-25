import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Store Performance Statistics Controller
 * 
 * Generates performance statistics for all stores in the network.

 * - Total number of sales
 * - Total products sold
 * - Total revenue
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function stats(req, res, next) {
  try {
    const stores = await prisma.store.findMany();
    const stats = await Promise.all(
      stores.map(async (store) => {
        const sales = await prisma.sale.findMany({
          where: { storeId: store.id },
          include: { lines: true },
        });
        let revenue = 0;
        let productsSold = 0;
        sales.forEach((sale) => {
          sale.lines.forEach((line) => {
            revenue += line.unitPrice * line.quantity;
            productsSold += line.quantity;
          });
        });
        return {
          id: store.id,
          name: store.name,
          totalSales: sales.length,
          productsSold,
          revenue,
        };
      })
    );
    res.json(stats);
  } catch (e) { next(e); }
}

/**
 * Consolidated Sales Report Controller
 * 
 * Retrieves detailed sales data across all stores with optional date filtering.
 * Provides comprehensive sales information including store details, client information,
 * and line item details for each sale.
 * 
 * @param {Request} req - Express request object with optional date range query parameters
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function consolidatedSales(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    }
    const sales = await prisma.sale.findMany({
      where,
      include: { store: true, user: true, lines: true },
    });
    res.json(sales);
  } catch (e) { next(e); }
}

/**
 * Get consolidated stats for all stores
 */
export async function getStats(req, res, next) {
  try {
    // Get stats for all stores
    const stores = await prisma.store.findMany();
    
    // For each store, get sales and calculate stats
    const stats = await Promise.all(stores.map(async (store) => {
      // Get all sales for this store
      const sales = await prisma.sale.findMany({
        where: { 
          storeId: store.id,
          // If excludeRefunded is true, only include active sales
          ...(req.query.excludeRefunded === 'true' && { status: 'active' })
        },
        include: { 
          lines: { include: { product: true } }
        }
      });
      
      // Calculate total products sold and revenue
      let productsSold = 0;
      let revenue = 0;
      
      sales.forEach(sale => {
        sale.lines.forEach(line => {
          productsSold += line.quantity;
          revenue += line.quantity * line.unitPrice;
        });
      });
      
      return {
        id: store.id,
        name: store.name,
        totalSales: sales.length,
        productsSold,
        revenue
      };
    }));
    
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

/**
 * Get refund statistics for all stores
 */
export async function getRefundStats(req, res, next) {
  try {
    // Get all stores
    const stores = await prisma.store.findMany();
    
    // For each store, get refund statistics
    const refundStats = await Promise.all(stores.map(async (store) => {
      // Get all refunds for this store
      const refunds = await prisma.refund.findMany({
        where: { storeId: store.id },
        include: { lines: true }
      });
      
      // Calculate total refund amount
      let refundTotal = 0;
      refunds.forEach(refund => {
        refundTotal += refund.total;
      });
      
      return {
        id: store.id,
        name: store.name,
        count: refunds.length,
        total: refundTotal
      };
    }));
    
    res.json(refundStats);
  } catch (err) {
    next(err);
  }
}

/**
 * Get consolidated sales data within a date range
 */
export async function getConsolidatedSales(req, res, next) {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Start and end dates are required" });
  }
  
  try {
    const sales = await prisma.sale.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate + 'T23:59:59')
        }
      },
      include: {
        lines: {
          include: {
            product: true
          }
        },
        store: true,
        user: true
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    res.json(sales);
  } catch (err) {
    next(err);
  }
} 