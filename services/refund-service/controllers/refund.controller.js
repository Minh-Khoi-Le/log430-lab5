/**
 * Refund Controller for Refund Service
 * 
 * This controller manages all refund-related operations in the microservices architecture.
 * It provides endpoints for refund processing, approval workflows, and refund analytics.
 * 
 * Features:
 * - Refund request creation and processing
 * - Multi-level approval workflows
 * - Refund status tracking and updates
 * - Integration with sales and stock services
 * - Analytics and reporting capabilities
 * - Comprehensive audit logging
 * 
 * @author Refund Service Team
 * @version 1.0.0
 */

import RefundService from '../services/refund.service.js';
import { promClient } from '../middleware/metrics.js';
import logger from '../utils/logger.js';

// Metrics for refund operations
const refundOperationCounter = new promClient.Counter({
  name: 'refund_operations_total',
  help: 'Total number of refund operations',
  labelNames: ['operation', 'status', 'store_id', 'refund_type']
});

const refundOperationDuration = new promClient.Histogram({
  name: 'refund_operation_duration_seconds',
  help: 'Duration of refund operations in seconds',
  labelNames: ['operation']
});

const refundAmountGauge = new promClient.Gauge({
  name: 'refund_amount_total',
  help: 'Total refund amount by store',
  labelNames: ['store_id', 'status', 'time_period']
});

const refundCountGauge = new promClient.Gauge({
  name: 'refund_count_total',
  help: 'Total number of refunds by store',
  labelNames: ['store_id', 'status', 'time_period']
});

/**
 * Create Refund Request Controller
 * 
 * Handles the creation of new refund requests with validation and workflow initiation
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const createRefund = async (req, res, next) => {
  const timer = refundOperationDuration.startTimer({ operation: 'create_refund' });
  
  try {
    logger.info('Creating refund request', {
      saleId: req.body.saleId,
      amount: req.body.amount,
      userId: req.user.id,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Extract refund data from request
    const refundData = {
      saleId: req.body.saleId,
      amount: req.body.amount,
      reason: req.body.reason,
      refundType: req.body.refundType || 'FULL',
      items: req.body.items || [],
      notes: req.body.notes,
      customerEmail: req.body.customerEmail,
      requestedBy: req.user.id
    };

    // Create refund through service
    const refund = await RefundService.createRefund(refundData, req.user);

    // Update metrics
    refundOperationCounter.inc({
      operation: 'create_refund',
      status: 'success',
      store_id: refund.sale.storeId,
      refund_type: refund.refundType
    });

    logger.info('Refund request created successfully', {
      refundId: refund.id,
      saleId: refund.saleId,
      amount: refund.amount,
      status: refund.status,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Refund request created successfully',
      data: refund,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating refund request', {
      error: error.message,
      stack: error.stack,
      saleId: req.body.saleId,
      userId: req.user.id,
      ip: req.ip
    });

    refundOperationCounter.inc({
      operation: 'create_refund',
      status: 'error',
      store_id: req.body.storeId || 'unknown',
      refund_type: req.body.refundType || 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Get Refunds by Store Controller
 * 
 * Retrieves refunds for a specific store with filtering and pagination
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getRefundsByStore = async (req, res, next) => {
  const timer = refundOperationDuration.startTimer({ operation: 'get_refunds_by_store' });
  
  try {
    const storeId = parseInt(req.params.storeId);
    const filters = {
      status: req.query.status,
      refundType: req.query.refundType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      reason: req.query.reason,
      requestedBy: req.query.requestedBy,
      approvedBy: req.query.approvedBy
    };

    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50
    };

    logger.info('Retrieving refunds by store', {
      storeId,
      filters,
      pagination,
      userId: req.user.id
    });

    const result = await RefundService.getRefundsByStore(storeId, filters, pagination);

    // Update metrics
    refundOperationCounter.inc({
      operation: 'get_refunds_by_store',
      status: 'success',
      store_id: storeId
    });

    logger.info('Refunds retrieved successfully', {
      storeId,
      count: result.refunds.length,
      totalCount: result.pagination.totalCount,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Refunds retrieved successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error retrieving refunds by store', {
      error: error.message,
      storeId: req.params.storeId,
      userId: req.user.id
    });

    refundOperationCounter.inc({
      operation: 'get_refunds_by_store',
      status: 'error',
      store_id: req.params.storeId || 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Get Refund by ID Controller
 * 
 * Retrieves a specific refund by its ID with full details
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getRefundById = async (req, res, next) => {
  const timer = refundOperationDuration.startTimer({ operation: 'get_refund_by_id' });
  
  try {
    const refundId = parseInt(req.params.refundId);

    logger.info('Retrieving refund by ID', {
      refundId,
      userId: req.user.id
    });

    const refund = await RefundService.getRefundById(refundId);

    // Update metrics
    refundOperationCounter.inc({
      operation: 'get_refund_by_id',
      status: 'success',
      store_id: refund.sale.storeId
    });

    logger.info('Refund retrieved successfully', {
      refundId,
      saleId: refund.saleId,
      status: refund.status,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Refund retrieved successfully',
      data: refund,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error retrieving refund by ID', {
      error: error.message,
      refundId: req.params.refundId,
      userId: req.user.id
    });

    refundOperationCounter.inc({
      operation: 'get_refund_by_id',
      status: 'error',
      store_id: 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Update Refund Status Controller
 * 
 * Updates the status of a refund (approve, reject, complete)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const updateRefundStatus = async (req, res, next) => {
  const timer = refundOperationDuration.startTimer({ operation: 'update_refund_status' });
  
  try {
    const refundId = parseInt(req.params.refundId);
    const { status, notes } = req.body;

    logger.info('Updating refund status', {
      refundId,
      status,
      notes,
      userId: req.user.id
    });

    const refund = await RefundService.updateRefundStatus(refundId, status, notes, req.user);

    // Update metrics
    refundOperationCounter.inc({
      operation: 'update_refund_status',
      status: 'success',
      store_id: refund.sale.storeId,
      refund_type: refund.refundType
    });

    logger.info('Refund status updated successfully', {
      refundId,
      newStatus: status,
      previousStatus: refund.statusHistory?.[refund.statusHistory.length - 2]?.status,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Refund status updated successfully',
      data: refund,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error updating refund status', {
      error: error.message,
      refundId: req.params.refundId,
      status: req.body.status,
      userId: req.user.id
    });

    refundOperationCounter.inc({
      operation: 'update_refund_status',
      status: 'error',
      store_id: 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Process Refund Controller
 * 
 * Processes a refund (executes the actual refund operation)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const processRefund = async (req, res, next) => {
  const timer = refundOperationDuration.startTimer({ operation: 'process_refund' });
  
  try {
    const refundId = parseInt(req.params.refundId);
    const { paymentMethod, transactionDetails } = req.body;

    logger.info('Processing refund', {
      refundId,
      paymentMethod,
      userId: req.user.id
    });

    const refund = await RefundService.processRefund(refundId, {
      paymentMethod,
      transactionDetails,
      processedBy: req.user.id
    });

    // Update metrics
    refundOperationCounter.inc({
      operation: 'process_refund',
      status: 'success',
      store_id: refund.sale.storeId,
      refund_type: refund.refundType
    });

    refundAmountGauge.inc({
      store_id: refund.sale.storeId,
      status: refund.status,
      time_period: 'current'
    }, refund.amount);

    logger.info('Refund processed successfully', {
      refundId,
      amount: refund.amount,
      paymentMethod,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: refund,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error processing refund', {
      error: error.message,
      refundId: req.params.refundId,
      userId: req.user.id
    });

    refundOperationCounter.inc({
      operation: 'process_refund',
      status: 'error',
      store_id: 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Get Refund Analytics Controller
 * 
 * Retrieves refund analytics and statistics for a store
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getRefundAnalytics = async (req, res, next) => {
  const timer = refundOperationDuration.startTimer({ operation: 'get_refund_analytics' });
  
  try {
    const storeId = parseInt(req.params.storeId);
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      groupBy: req.query.groupBy || 'day'
    };

    logger.info('Generating refund analytics', {
      storeId,
      options,
      userId: req.user.id
    });

    const analytics = await RefundService.getRefundAnalytics(storeId, options);

    // Update metrics
    refundOperationCounter.inc({
      operation: 'get_refund_analytics',
      status: 'success',
      store_id: storeId
    });

    logger.info('Refund analytics generated successfully', {
      storeId,
      totalRefunds: analytics.summary.totalRefunds,
      totalAmount: analytics.summary.totalAmount,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Refund analytics retrieved successfully',
      data: analytics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error generating refund analytics', {
      error: error.message,
      storeId: req.params.storeId,
      userId: req.user.id
    });

    refundOperationCounter.inc({
      operation: 'get_refund_analytics',
      status: 'error',
      store_id: req.params.storeId || 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Get Pending Approvals Controller
 * 
 * Retrieves refunds that are pending approval
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getPendingApprovals = async (req, res, next) => {
  const timer = refundOperationDuration.startTimer({ operation: 'get_pending_approvals' });
  
  try {
    const storeId = req.query.storeId ? parseInt(req.query.storeId) : null;
    const filters = {
      storeId,
      priority: req.query.priority,
      amount: req.query.minAmount ? { gte: parseFloat(req.query.minAmount) } : undefined
    };

    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50
    };

    logger.info('Retrieving pending approvals', {
      filters,
      pagination,
      userId: req.user.id
    });

    const result = await RefundService.getPendingApprovals(filters, pagination);

    // Update metrics
    refundOperationCounter.inc({
      operation: 'get_pending_approvals',
      status: 'success',
      store_id: storeId || 'all'
    });

    logger.info('Pending approvals retrieved successfully', {
      count: result.refunds.length,
      totalCount: result.pagination.totalCount,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Pending approvals retrieved successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error retrieving pending approvals', {
      error: error.message,
      userId: req.user.id
    });

    refundOperationCounter.inc({
      operation: 'get_pending_approvals',
      status: 'error',
      store_id: 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Bulk Approve Refunds Controller
 * 
 * Approves multiple refunds in a single operation
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const bulkApproveRefunds = async (req, res, next) => {
  const timer = refundOperationDuration.startTimer({ operation: 'bulk_approve_refunds' });
  
  try {
    const { refundIds, notes } = req.body;

    logger.info('Bulk approving refunds', {
      refundIds,
      count: refundIds.length,
      notes,
      userId: req.user.id
    });

    const result = await RefundService.bulkApproveRefunds(refundIds, notes, req.user);

    // Update metrics
    refundOperationCounter.inc({
      operation: 'bulk_approve_refunds',
      status: 'success',
      store_id: 'multiple'
    }, refundIds.length);

    logger.info('Bulk refund approval completed', {
      processed: result.processed,
      successful: result.successful.length,
      failed: result.failed.length,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Bulk refund approval completed',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in bulk refund approval', {
      error: error.message,
      refundIds: req.body.refundIds,
      userId: req.user.id
    });

    refundOperationCounter.inc({
      operation: 'bulk_approve_refunds',
      status: 'error',
      store_id: 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};

/**
 * Cancel Refund Controller
 * 
 * Cancels a refund request
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const cancelRefund = async (req, res, next) => {
  const timer = refundOperationDuration.startTimer({ operation: 'cancel_refund' });
  
  try {
    const refundId = parseInt(req.params.refundId);
    const { reason } = req.body;

    logger.info('Cancelling refund', {
      refundId,
      reason,
      userId: req.user.id
    });

    const refund = await RefundService.cancelRefund(refundId, reason, req.user);

    // Update metrics
    refundOperationCounter.inc({
      operation: 'cancel_refund',
      status: 'success',
      store_id: refund.sale.storeId,
      refund_type: refund.refundType
    });

    logger.info('Refund cancelled successfully', {
      refundId,
      reason,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Refund cancelled successfully',
      data: refund,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error cancelling refund', {
      error: error.message,
      refundId: req.params.refundId,
      userId: req.user.id
    });

    refundOperationCounter.inc({
      operation: 'cancel_refund',
      status: 'error',
      store_id: 'unknown'
    });

    next(error);
  } finally {
    timer();
  }
};
