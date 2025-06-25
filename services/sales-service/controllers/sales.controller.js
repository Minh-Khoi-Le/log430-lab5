/**
 * Sales Controller for Sales Service
 * 
 * This controller manages all sales-related operations in the microservices architecture.
 * It provides endpoints for transaction processing, sales history, and sales analytics.
 * 
 * Features:
 * - Sales transaction creation with validation
 * - Sales history retrieval and filtering
 * - Sales analytics and reporting
 * - Integration with stock service for inventory updates
 * - Integration with cart service for e-commerce checkouts
 * - Comprehensive metrics and monitoring
 * 
 * @author Sales Service Team
 * @version 1.0.0
 */

import SalesService from '../services/sales.service.js';
import { ApiError } from '../middleware/errorHandler.js';
import { promClient } from '../middleware/metrics.js';
import logger from '../utils/logger.js';

// Metrics for sales operations
const salesOperationCounter = new promClient.Counter({
  name: 'sales_operations_total',
  help: 'Total number of sales operations',
  labelNames: ['operation', 'status', 'store_id']
});

const salesOperationDuration = new promClient.Histogram({
  name: 'sales_operation_duration_seconds',
  help: 'Duration of sales operations in seconds',
  labelNames: ['operation']
});

const salesAmountGauge = new promClient.Gauge({
  name: 'sales_amount_total',
  help: 'Total sales amount',
  labelNames: ['store_id', 'time_period']
});

const salesCountGauge = new promClient.Gauge({
  name: 'sales_count_total',
  help: 'Total number of sales',
  labelNames: ['store_id', 'time_period']
});

/**
 * Create Sale Controller
 * 
 * Creates a new sales transaction with comprehensive validation.
 * Handles both physical store and e-commerce transactions.
 * 
 * @param {Request} req - Express request object with sale data
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * Body Requirements:
 * - storeId: Store ID (integer)
 * - userId: User/Customer ID (integer, optional if clientName provided)
 * - clientName: Customer name (string, optional if userId provided)
 * - lines: Array of sale line items
 *   - productId: Product ID (integer)
 *   - quantity: Quantity (integer, > 0)
 *   - unitPrice: Unit price (number, > 0)
 * - cart: Alternative to lines (from e-commerce cart)
 * - paymentMethod: Payment method (optional)
 * - notes: Additional notes (optional)
 * 
 * Response: 201 Created with sale details
 */
export async function createSale(req, res, next) {
  const timer = salesOperationDuration.startTimer({ operation: 'create_sale' });
  
  try {
    const saleData = req.body;
    
    // Basic validation
    if (!saleData.storeId || isNaN(parseInt(saleData.storeId))) {
      throw new ApiError(400, 'Valid store ID is required');
    }
    
    if (!saleData.userId && !saleData.clientName) {
      throw new ApiError(400, 'Either user ID or client name is required');
    }
    
    if (!saleData.lines && !saleData.cart) {
      throw new ApiError(400, 'Sale lines or cart data is required');
    }
    
    // Convert cart to lines if provided
    if (saleData.cart && !saleData.lines) {
      saleData.lines = saleData.cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price || item.unitPrice
      }));
    }
    
    // Validate lines
    if (!Array.isArray(saleData.lines) || saleData.lines.length === 0) {
      throw new ApiError(400, 'At least one sale line is required');
    }
    
    for (const line of saleData.lines) {
      if (!line.productId || isNaN(parseInt(line.productId))) {
        throw new ApiError(400, 'Each line must have a valid product ID');
      }
      if (!line.quantity || isNaN(parseInt(line.quantity)) || parseInt(line.quantity) <= 0) {
        throw new ApiError(400, 'Each line must have a valid quantity greater than 0');
      }
      if (!line.unitPrice || isNaN(parseFloat(line.unitPrice)) || parseFloat(line.unitPrice) <= 0) {
        throw new ApiError(400, 'Each line must have a valid unit price greater than 0');
      }
    }
    
    const sale = await SalesService.createSale({
      ...saleData,
      userId: req.user?.id || saleData.userId,
      createdBy: req.user?.id
    });
    
    // Update metrics
    salesOperationCounter.inc({ 
      operation: 'create_sale', 
      status: 'success', 
      store_id: saleData.storeId 
    });
    
    salesAmountGauge.inc({ 
      store_id: saleData.storeId, 
      time_period: 'daily' 
    }, sale.total);
    
    salesCountGauge.inc({ 
      store_id: saleData.storeId, 
      time_period: 'daily' 
    });
    
    logger.info('Sale created successfully', {
      saleId: sale.id,
      storeId: sale.storeId,
      userId: sale.userId,
      total: sale.total,
      lineCount: sale.lines?.length || 0
    });
    
    res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      data: sale
    });
  } catch (error) {
    salesOperationCounter.inc({ 
      operation: 'create_sale', 
      status: 'error', 
      store_id: req.body.storeId || 'unknown'
    });
    next(error);
  } finally {
    timer();
  }
}

/**
 * List Sales Controller
 * 
 * Retrieves a paginated list of sales with filtering options.
 * Supports various filters for comprehensive sales management.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - storeId: Filter by store
 * - userId: Filter by user/customer
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 * - minAmount: Filter by minimum amount
 * - maxAmount: Filter by maximum amount
 * - status: Filter by status (pending, completed, refunded)
 * 
 * Response: 200 OK with paginated sales data
 */
export async function listSales(req, res, next) {
  const timer = salesOperationDuration.startTimer({ operation: 'list_sales' });
  
  try {
    const {
      page = 1,
      limit = 20,
      storeId,
      userId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      status
    } = req.query;
    
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    
    const filters = {};
    if (storeId && !isNaN(parseInt(storeId))) {
      filters.storeId = parseInt(storeId);
    }
    if (userId && !isNaN(parseInt(userId))) {
      filters.userId = parseInt(userId);
    }
    if (startDate) {
      filters.startDate = new Date(startDate);
    }
    if (endDate) {
      filters.endDate = new Date(endDate);
    }
    if (minAmount && !isNaN(parseFloat(minAmount))) {
      filters.minAmount = parseFloat(minAmount);
    }
    if (maxAmount && !isNaN(parseFloat(maxAmount))) {
      filters.maxAmount = parseFloat(maxAmount);
    }
    if (status) {
      filters.status = status;
    }
    
    const result = await SalesService.getSales({
      page: pageNum,
      limit: limitNum,
      filters
    });
    
    salesOperationCounter.inc({ 
      operation: 'list_sales', 
      status: 'success'
    });
    
    res.json({
      success: true,
      data: result.sales,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
        hasNext: pageNum < Math.ceil(result.total / limitNum),
        hasPrev: pageNum > 1
      },
      meta: {
        filters,
        totalAmount: result.totalAmount,
        averageAmount: result.averageAmount
      }
    });
  } catch (error) {
    salesOperationCounter.inc({ 
      operation: 'list_sales', 
      status: 'error'
    });
    next(error);
  } finally {
    timer();
  }
}

/**
 * Get Sale by ID Controller
 * 
 * Retrieves detailed information about a specific sale.
 * Includes all line items and related data.
 * 
 * @param {Request} req - Express request object with sale ID
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function getSaleById(req, res, next) {
  const timer = salesOperationDuration.startTimer({ operation: 'get_sale' });
  
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      throw new ApiError(400, 'Valid sale ID is required');
    }
    
    const sale = await SalesService.getSaleById(parseInt(id));
    
    if (!sale) {
      salesOperationCounter.inc({ 
        operation: 'get_sale', 
        status: 'not_found'
      });
      throw new ApiError(404, 'Sale not found');
    }
    
    salesOperationCounter.inc({ 
      operation: 'get_sale', 
      status: 'success'
    });
    
    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    salesOperationCounter.inc({ 
      operation: 'get_sale', 
      status: 'error'
    });
    next(error);
  } finally {
    timer();
  }
}

/**
 * Get Sales by User Controller
 * 
 * Retrieves sales history for a specific user/customer.
 * Useful for customer service and account management.
 * 
 * @param {Request} req - Express request object with user ID
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function getSalesByUser(req, res, next) {
  const timer = salesOperationDuration.startTimer({ operation: 'get_sales_by_user' });
  
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, includeRefunded = false } = req.query;
    
    if (!userId || isNaN(parseInt(userId))) {
      throw new ApiError(400, 'Valid user ID is required');
    }
    
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    
    const result = await SalesService.getSalesByUser(parseInt(userId), {
      page: pageNum,
      limit: limitNum,
      includeRefunded: includeRefunded === 'true'
    });
    
    salesOperationCounter.inc({ 
      operation: 'get_sales_by_user', 
      status: 'success'
    });
    
    res.json({
      success: true,
      data: result.sales,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum)
      },
      meta: {
        userId: parseInt(userId),
        totalAmount: result.totalAmount,
        totalSales: result.total
      }
    });
  } catch (error) {
    salesOperationCounter.inc({ 
      operation: 'get_sales_by_user', 
      status: 'error'
    });
    next(error);
  } finally {
    timer();
  }
}

/**
 * Get Sales by Store Controller
 * 
 * Retrieves sales for a specific store with analytics.
 * Useful for store management and performance tracking.
 * 
 * @param {Request} req - Express request object with store ID
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function getSalesByStore(req, res, next) {
  const timer = salesOperationDuration.startTimer({ operation: 'get_sales_by_store' });
  
  try {
    const { storeId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      startDate, 
      endDate,
      includeAnalytics = false 
    } = req.query;
    
    if (!storeId || isNaN(parseInt(storeId))) {
      throw new ApiError(400, 'Valid store ID is required');
    }
    
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    
    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    
    const result = await SalesService.getSalesByStore(parseInt(storeId), {
      page: pageNum,
      limit: limitNum,
      filters,
      includeAnalytics: includeAnalytics === 'true'
    });
    
    salesOperationCounter.inc({ 
      operation: 'get_sales_by_store', 
      status: 'success', 
      store_id: storeId 
    });
    
    res.json({
      success: true,
      data: result.sales,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum)
      },
      meta: {
        storeId: parseInt(storeId),
        ...result.analytics
      }
    });
  } catch (error) {
    salesOperationCounter.inc({ 
      operation: 'get_sales_by_store', 
      status: 'error', 
      store_id: req.params.storeId 
    });
    next(error);
  } finally {
    timer();
  }
}

/**
 * Get Sales Analytics Controller
 * 
 * Provides comprehensive sales analytics and reporting.
 * Includes time-based trends, top products, and performance metrics.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function getSalesAnalytics(req, res, next) {
  const timer = salesOperationDuration.startTimer({ operation: 'get_sales_analytics' });
  
  try {
    const {
      storeId,
      startDate,
      endDate,
      groupBy = 'day', // day, week, month
      includeProducts = false,
      includeCustomers = false
    } = req.query;
    
    const filters = {};
    if (storeId && !isNaN(parseInt(storeId))) {
      filters.storeId = parseInt(storeId);
    }
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    
    const analytics = await SalesService.getSalesAnalytics({
      filters,
      groupBy,
      includeProducts: includeProducts === 'true',
      includeCustomers: includeCustomers === 'true'
    });
    
    salesOperationCounter.inc({ 
      operation: 'get_sales_analytics', 
      status: 'success'
    });
    
    res.json({
      success: true,
      data: analytics,
      meta: {
        filters,
        groupBy,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    salesOperationCounter.inc({ 
      operation: 'get_sales_analytics', 
      status: 'error'
    });
    next(error);
  } finally {
    timer();
  }
}

/**
 * Update Sale Status Controller
 * 
 * Updates the status of a sale (e.g., from pending to completed).
 * Used for order management and workflow control.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function updateSaleStatus(req, res, next) {
  const timer = salesOperationDuration.startTimer({ operation: 'update_sale_status' });
  
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    if (!id || isNaN(parseInt(id))) {
      throw new ApiError(400, 'Valid sale ID is required');
    }
    
    if (!status || !['pending', 'completed', 'cancelled', 'refunded'].includes(status)) {
      throw new ApiError(400, 'Valid status is required (pending, completed, cancelled, refunded)');
    }
    
    const sale = await SalesService.updateSaleStatus(parseInt(id), {
      status,
      notes,
      updatedBy: req.user?.id
    });
    
    salesOperationCounter.inc({ 
      operation: 'update_sale_status', 
      status: 'success'
    });
    
    logger.info('Sale status updated', {
      saleId: sale.id,
      newStatus: status,
      updatedBy: req.user?.id
    });
    
    res.json({
      success: true,
      message: 'Sale status updated successfully',
      data: sale
    });
  } catch (error) {
    salesOperationCounter.inc({ 
      operation: 'update_sale_status', 
      status: 'error'
    });
    next(error);
  } finally {
    timer();
  }
}

export default {
  createSale,
  listSales,
  getSaleById,
  getSalesByUser,
  getSalesByStore,
  getSalesAnalytics,
  updateSaleStatus
};
