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
 * - Comprehensive error handling with shared components
 * - Metrics collection via shared middleware
 * 
 * @author Sales Service Team
 * @version 2.0.0
 */

import SalesService from '../services/sales.service.js';

// Import shared components
import {
  ValidationError,
  NotFoundError,
  logger,
  asyncHandler,
  recordOperation
} from '../../shared/index.js';

/**
 * Create Sale Controller
 * 
 * Handles the creation of new sales transactions with comprehensive validation
 */
export const createSale = asyncHandler(async (req, res) => {
  const { storeId, customerId, items, cart, totalAmount, discounts } = req.body;

  // Handle both frontend cart format and direct items format
  const saleItems = items || cart;

  // Basic input validation
  if (!storeId || !saleItems || !Array.isArray(saleItems) || saleItems.length === 0) {
    throw new ValidationError('Store ID and items are required');
  }

  // Calculate total amount if not provided
  let calculatedTotal = 0;
  const processedItems = [];

  // Validate items structure and calculate total
  for (const item of saleItems) {
    if (!item.productId || !item.quantity || item.quantity <= 0) {
      throw new ValidationError('Each item must have a valid productId and positive quantity');
    }

    // Handle both price formats (item.price vs item.unitPrice)
    const unitPrice = item.unitPrice || item.price;
    if (!unitPrice || unitPrice <= 0) {
      throw new ValidationError('Each item must have a valid price');
    }

    calculatedTotal += unitPrice * item.quantity;
    processedItems.push({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: unitPrice
    });
  }

  const finalTotal = totalAmount || calculatedTotal;

  logger.info('Creating new sale', {
    storeId,
    customerId,
    itemCount: processedItems.length,
    totalAmount: finalTotal,
    userId: req.user?.id
  });

  // Record operation for metrics
  recordOperation('sales_create', 'start');

  try {
    // Extract token for service-to-service communication
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    const sale = await SalesService.createSale({
      storeId,
      customerId: customerId || req.user.id, // Use authenticated user ID if customerId not provided
      items: processedItems,
      totalAmount: finalTotal,
      discounts
    }, { ...req.user, token });

    recordOperation('sales_create', 'success');

    logger.info('Sale created successfully', {
      saleId: sale.id,
      storeId,
      totalAmount: sale.total // Use correct field name
    });

    res.status(201).json({
      success: true,
      data: sale,
      sale: sale, // Include sale object for frontend compatibility
      message: 'Sale created successfully'
    });
  } catch (error) {
    recordOperation('sales_create', 'error');
    throw error;
  }
});

/**
 * Get All Sales Controller
 * 
 * Retrieves paginated list of sales with filtering options
 */
export const getAllSales = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    storeId,
    customerId,
    status,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Validate pagination parameters
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw new ValidationError('Invalid pagination parameters');
  }

  logger.info('Fetching sales list with role-based access', {
    page: pageNum,
    limit: limitNum,
    filters: { storeId, customerId, status, startDate, endDate },
    userId: req.user?.id,
    userRole: req.user?.role
  });

  const filters = {
    storeId: storeId ? parseInt(storeId) : undefined,
    customerId: customerId ? parseInt(customerId) : undefined,
    status,
    startDate,
    endDate
  };

  // Role-based filtering: clients can only see their own sales
  if (req.user?.role === 'client') {
    filters.customerId = req.user.id;
  }

  const result = await SalesService.getAllSales({
    page: pageNum,
    limit: limitNum,
    filters,
    sortBy,
    sortOrder
  });

  res.json({
    success: true,
    data: result.sales,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: result.total,
      pages: Math.ceil(result.total / limitNum)
    }
  });
});

/**
 * Get Sale by ID Controller
 * 
 * Retrieves a specific sale by its ID
 */
export const getSaleById = asyncHandler(async (req, res) => {
  const { saleId } = req.params;
  const saleIdNum = parseInt(saleId);

  if (!saleIdNum || saleIdNum < 1) {
    throw new ValidationError('Invalid sale ID');
  }

  logger.info('Fetching sale by ID', { saleId: saleIdNum, userId: req.user?.id, userRole: req.user?.role });

  const sale = await SalesService.getSaleById(saleIdNum);

  if (!sale) {
    throw new NotFoundError(`Sale with ID ${saleIdNum} not found`);
  }

  // Role-based access control: clients can only view their own sales
  if (req.user?.role === 'client' && sale.userId !== req.user.id) {
    throw new ValidationError('Access denied: You can only view your own sales');
  }

  res.json({
    success: true,
    data: sale
  });
});

/**
 * Update Sale Status Controller
 * 
 * Updates the status of an existing sale
 */
export const updateSaleStatus = asyncHandler(async (req, res) => {
  const { saleId } = req.params;
  const { status, reason } = req.body;
  const saleIdNum = parseInt(saleId);

  if (!saleIdNum || saleIdNum < 1) {
    throw new ValidationError('Invalid sale ID');
  }

  const validStatuses = ['COMPLETED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'];
  if (!status || !validStatuses.includes(status)) {
    throw new ValidationError('Invalid status. Must be one of: ' + validStatuses.join(', '));
  }

  logger.info('Updating sale status', {
    saleId: saleIdNum,
    status,
    reason,
    userId: req.user?.id
  });

  const updatedSale = await SalesService.updateSaleStatus(saleIdNum, status, req.user || { id: 'system' });

  if (!updatedSale) {
    throw new NotFoundError(`Sale with ID ${saleIdNum} not found`);
  }

  logger.info('Sale status updated successfully', {
    saleId: saleIdNum,
    newStatus: status
  });

  res.json({
    success: true,
    data: updatedSale,
    message: 'Sale status updated successfully'
  });
});

/**
 * Cancel Sale Controller
 * 
 * Cancels an existing sale and reverts inventory
 */
export const cancelSale = asyncHandler(async (req, res) => {
  const { saleId } = req.params;
  const { reason } = req.body;
  const saleIdNum = parseInt(saleId);

  if (!saleIdNum || saleIdNum < 1) {
    throw new ValidationError('Invalid sale ID');
  }

  if (!reason || reason.trim().length === 0) {
    throw new ValidationError('Cancellation reason is required');
  }

  logger.info('Cancelling sale', {
    saleId: saleIdNum,
    reason,
    userId: req.user?.id
  });

  const cancelledSale = await SalesService.cancelSale(saleIdNum, reason, req.user.id);

  if (!cancelledSale) {
    throw new NotFoundError(`Sale with ID ${saleIdNum} not found`);
  }

  logger.info('Sale cancelled successfully', { saleId: saleIdNum });

  res.json({
    success: true,
    data: cancelledSale,
    message: 'Sale cancelled successfully'
  });
});

/**
 * Get Sales by Store Controller
 * 
 * Retrieves sales for a specific store
 */
export const getSalesByStore = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const { page = 1, limit = 20, status, startDate, endDate } = req.query;
  const storeIdNum = parseInt(storeId);

  if (!storeIdNum || storeIdNum < 1) {
    throw new ValidationError('Invalid store ID');
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw new ValidationError('Invalid pagination parameters');
  }

  logger.info('Fetching sales by store', {
    storeId: storeIdNum,
    page: pageNum,
    limit: limitNum,
    userId: req.user?.id
  });

  const result = await SalesService.getSalesByStore(storeIdNum, {
    page: pageNum,
    limit: limitNum,
    status,
    startDate,
    endDate
  });

  res.json({
    success: true,
    data: result.sales,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: result.total,
      pages: Math.ceil(result.total / limitNum)
    }
  });
});

/**
 * Get Sales by Customer Controller
 * 
 * Retrieves sales for a specific customer
 */
export const getSalesByCustomer = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const { page = 1, limit = 20, status } = req.query;
  const customerIdNum = parseInt(customerId);

  if (!customerIdNum || customerIdNum < 1) {
    throw new ValidationError('Invalid customer ID');
  }

  // Role-based access control
  if (req.user?.role === 'client' && req.user.id !== customerIdNum) {
    throw new ValidationError('Access denied: You can only view your own sales');
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw new ValidationError('Invalid pagination parameters');
  }

  logger.info('Fetching sales by customer with role-based access', {
    customerId: customerIdNum,
    requestingUserId: req.user?.id,
    userRole: req.user?.role,
    page: pageNum,
    limit: limitNum
  });

  const result = await SalesService.getSalesByCustomer(customerIdNum, {
    page: pageNum,
    limit: limitNum,
    status
  });

  res.json({
    success: true,
    data: result.sales,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: result.total,
      pages: Math.ceil(result.total / limitNum)
    }
  });
});

/**
 * Get Sales Analytics Controller
 * 
 * Provides comprehensive sales analytics and metrics
 */
export const getSalesAnalytics = asyncHandler(async (req, res) => {
  const { storeId, startDate, endDate, groupBy = 'day' } = req.query;

  const validGroupBy = ['hour', 'day', 'week', 'month'];
  if (!validGroupBy.includes(groupBy)) {
    throw new ValidationError('Invalid groupBy parameter. Must be one of: ' + validGroupBy.join(', '));
  }

  logger.info('Fetching sales analytics', {
    storeId,
    startDate,
    endDate,
    groupBy,
    userId: req.user?.id
  });

  const analytics = await SalesService.getSalesAnalytics({
    storeId: storeId ? parseInt(storeId) : undefined,
    startDate,
    endDate,
    groupBy
  });

  res.json({
    success: true,
    data: analytics
  });
});

/**
 * Get Sales by Date Range Controller
 * 
 * Retrieves sales within a specific date range
 */
export const getSalesByDateRange = asyncHandler(async (req, res) => {
  const { startDate, endDate, storeId, page = 1, limit = 20 } = req.query;

  if (!startDate || !endDate) {
    throw new ValidationError('Start date and end date are required');
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw new ValidationError('Invalid pagination parameters');
  }

  logger.info('Fetching sales by date range', {
    startDate,
    endDate,
    storeId,
    page: pageNum,
    limit: limitNum,
    userId: req.user?.id
  });

  const result = await SalesService.getSalesByDateRange({
    startDate,
    endDate,
    storeId: storeId ? parseInt(storeId) : undefined,
    page: pageNum,
    limit: limitNum
  });

  res.json({
    success: true,
    data: result.sales,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: result.total,
      pages: Math.ceil(result.total / limitNum)
    }
  });
});

/**
 * Get Sales Trends Controller
 * 
 * Provides sales trend analysis over time
 */
export const getSalesTrends = asyncHandler(async (req, res) => {
  const { period = '30d', storeId, metric = 'revenue' } = req.query;

  const validPeriods = ['7d', '30d', '90d', '1y'];
  const validMetrics = ['revenue', 'count', 'average'];

  if (!validPeriods.includes(period)) {
    throw new ValidationError('Invalid period. Must be one of: ' + validPeriods.join(', '));
  }

  if (!validMetrics.includes(metric)) {
    throw new ValidationError('Invalid metric. Must be one of: ' + validMetrics.join(', '));
  }

  logger.info('Fetching sales trends', {
    period,
    storeId,
    metric,
    userId: req.user?.id
  });

  const trends = await SalesService.getSalesTrends({
    period,
    storeId: storeId ? parseInt(storeId) : undefined,
    metric
  });

  res.json({
    success: true,
    data: trends
  });
});

/**
 * Process Sale Refund Controller
 * 
 * Initiates refund process for a sale
 */
export const processSaleRefund = asyncHandler(async (req, res) => {
  const { saleId } = req.params;
  const { reason, amount, items } = req.body;
  const saleIdNum = parseInt(saleId);

  if (!saleIdNum || saleIdNum < 1) {
    throw new ValidationError('Invalid sale ID');
  }

  if (!reason || reason.trim().length === 0) {
    throw new ValidationError('Refund reason is required');
  }

  logger.info('Processing sale refund', {
    saleId: saleIdNum,
    amount,
    reason,
    userId: req.user?.id
  });

  const refund = await SalesService.processSaleRefund({
    saleId: saleIdNum,
    reason,
    amount,
    items,
    userId: req.user.id
  });

  logger.info('Sale refund processed successfully', {
    saleId: saleIdNum,
    refundId: refund.id
  });

  res.status(201).json({
    success: true,
    data: refund,
    message: 'Refund processed successfully'
  });
});

/**
 * Get Sale Receipt Controller
 * 
 * Generates and retrieves sale receipt
 */
export const getSaleReceipt = asyncHandler(async (req, res) => {
  const { saleId } = req.params;
  const { format = 'json' } = req.query;
  const saleIdNum = parseInt(saleId);

  if (!saleIdNum || saleIdNum < 1) {
    throw new ValidationError('Invalid sale ID');
  }

  const validFormats = ['json', 'pdf', 'html'];
  if (!validFormats.includes(format)) {
    throw new ValidationError('Invalid format. Must be one of: ' + validFormats.join(', '));
  }

  logger.info('Generating sale receipt', {
    saleId: saleIdNum,
    format,
    userId: req.user?.id
  });

  const receipt = await SalesService.generateReceipt(saleIdNum, format);

  if (!receipt) {
    throw new NotFoundError(`Sale with ID ${saleIdNum} not found`);
  }

  // Set appropriate content type based on format
  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${saleIdNum}.pdf`);
  } else if (format === 'html') {
    res.setHeader('Content-Type', 'text/html');
  }

  res.json({
    success: true,
    data: receipt
  });
});

export default {
  createSale,
  getAllSales,
  getSaleById,
  updateSaleStatus,
  cancelSale,
  getSalesByStore,
  getSalesByCustomer,
  getSalesAnalytics,
  getSalesByDateRange,
  getSalesTrends,
  processSaleRefund,
  getSaleReceipt
};
