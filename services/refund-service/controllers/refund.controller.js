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
 * @version 2.0.0
 */

import RefundService from '../services/refund.service.js';

// Import shared components
import {
  ValidationError,
  NotFoundError,
  logger,
  asyncHandler,
  recordOperation
} from '../../shared/index.js';

/**
 * Create Refund Request Controller
 * 
 * Handles the creation of new refund requests with validation and workflow initiation
 */
export const createRefund = asyncHandler(async (req, res) => {
  const { saleId, amount, reason, items, customerEmail, notes } = req.body;

  // Input validation
  if (!saleId || isNaN(saleId)) {
    throw new ValidationError('Valid sale ID is required');
  }

  if (!amount || amount <= 0) {
    throw new ValidationError('Valid positive refund amount is required');
  }

  if (!reason || reason.trim().length === 0) {
    throw new ValidationError('Refund reason is required');
  }

  if (items && (!Array.isArray(items) || items.length === 0)) {
    throw new ValidationError('Items must be a non-empty array if provided');
  }

  // Validate items if provided
  if (items) {
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        throw new ValidationError('Each item must have a valid productId and positive quantity');
      }
    }
  }

  logger.info('Creating refund request', {
    saleId,
    amount,
    reason,
    itemCount: items?.length || 0,
    userId: req.user?.id,
    ip: req.ip
  });

  recordOperation('refund_create', 'start');

  try {
    const refundData = {
      saleId: parseInt(saleId),
      amount: parseFloat(amount),
      reason: reason.trim(),
      items,
      customerEmail,
      notes: notes?.trim(),
      requestedBy: req.user?.id
    };

    const refund = await RefundService.createRefund(refundData, req.user);

    recordOperation('refund_create', 'success');

    logger.info('Refund request created successfully', {
      refundId: refund.id,
      saleId,
      amount: refund.amount,
      status: refund.status
    });

    res.status(201).json({
      success: true,
      message: 'Refund request created successfully',
      data: refund
    });
  } catch (error) {
    recordOperation('refund_create', 'error');
    throw error;
  }
});

/**
 * Get Refunds by Store Controller
 * 
 * Retrieves refunds for a specific store with filtering and pagination
 */
export const getRefundsByStore = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const { page = 1, limit = 20, status, startDate, endDate, minAmount, maxAmount } = req.query;

  // Input validation
  if (!storeId || isNaN(storeId)) {
    throw new ValidationError('Valid store ID is required');
  }

  logger.info('Retrieving refunds by store', {
    storeId,
    page,
    limit,
    status,
    startDate,
    endDate,
    userId: req.user?.id
  });

  recordOperation('refund_get_by_store', 'start');

  try {
    const filters = {
      status,
      startDate,
      endDate,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined
    };

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const result = await RefundService.getRefundsByStore(parseInt(storeId), filters, pagination);

    recordOperation('refund_get_by_store', 'success');

    logger.info('Store refunds retrieved successfully', {
      storeId,
      refundCount: result.refunds?.length || 0,
      totalRefunds: result.total
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    recordOperation('refund_get_by_store', 'error');
    throw error;
  }
});

/**
 * Get Refund by ID Controller
 * 
 * Retrieves a specific refund by its ID
 */
export const getRefundById = asyncHandler(async (req, res) => {
  const { refundId } = req.params;

  // Input validation
  if (!refundId || isNaN(refundId)) {
    throw new ValidationError('Valid refund ID is required');
  }

  logger.info('Retrieving refund by ID', {
    refundId,
    userId: req.user?.id
  });

  recordOperation('refund_get', 'start');

  try {
    const refund = await RefundService.getRefundById(refundId, req.user);

    if (!refund) {
      throw new NotFoundError('Refund not found');
    }

    recordOperation('refund_get', 'success');

    logger.info('Refund retrieved successfully', {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount
    });

    res.json({
      success: true,
      data: refund
    });
  } catch (error) {
    recordOperation('refund_get', 'error');
    throw error;
  }
});

/**
 * Update Refund Status Controller
 * 
 * Updates the status of a refund request
 */
export const updateRefundStatus = asyncHandler(async (req, res) => {
  const { refundId } = req.params;
  const { status, notes, approverComments } = req.body;

  // Input validation
  if (!refundId || isNaN(refundId)) {
    throw new ValidationError('Valid refund ID is required');
  }

  if (!status) {
    throw new ValidationError('Status is required');
  }

  const validStatuses = ['pending', 'approved', 'rejected', 'processed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  logger.info('Updating refund status', {
    refundId,
    status,
    hasNotes: !!notes,
    userId: req.user?.id
  });

  recordOperation('refund_update_status', 'start');

  try {
    const updateData = {
      status,
      notes: notes?.trim(),
      approverComments: approverComments?.trim(),
      updatedBy: req.user?.id
    };

    const refund = await RefundService.updateRefundStatus(refundId, updateData, req.user);

    recordOperation('refund_update_status', 'success');

    logger.info('Refund status updated successfully', {
      refundId: refund.id,
      oldStatus: refund.previousStatus,
      newStatus: refund.status
    });

    res.json({
      success: true,
      message: 'Refund status updated successfully',
      data: refund
    });
  } catch (error) {
    recordOperation('refund_update_status', 'error');
    throw error;
  }
});

/**
 * Process Refund Controller
 * 
 * Processes an approved refund by executing the actual refund transaction
 */
export const processRefund = asyncHandler(async (req, res) => {
  const { refundId } = req.params;
  const { paymentMethod, transactionReference, processingNotes } = req.body;

  // Input validation
  if (!refundId || isNaN(refundId)) {
    throw new ValidationError('Valid refund ID is required');
  }

  logger.info('Processing refund', {
    refundId,
    paymentMethod,
    hasTransactionRef: !!transactionReference,
    userId: req.user?.id
  });

  recordOperation('refund_process', 'start');

  try {
    const processData = {
      paymentMethod,
      transactionReference,
      processingNotes: processingNotes?.trim(),
      processedBy: req.user?.id
    };

    const refund = await RefundService.processRefund(refundId, processData, req.user);

    recordOperation('refund_process', 'success');

    logger.info('Refund processed successfully', {
      refundId: refund.id,
      amount: refund.amount,
      transactionReference: refund.transactionReference
    });

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: refund
    });
  } catch (error) {
    recordOperation('refund_process', 'error');
    throw error;
  }
});

/**
 * Get Refund Analytics Controller
 * 
 * Retrieves refund analytics and statistics
 */
export const getRefundAnalytics = asyncHandler(async (req, res) => {
  const { storeId, period, startDate, endDate, groupBy } = req.query;

  logger.info('Retrieving refund analytics', {
    storeId,
    period,
    startDate,
    endDate,
    groupBy,
    userId: req.user?.id
  });

  recordOperation('refund_analytics', 'start');

  try {
    const options = {
      storeId: storeId ? parseInt(storeId) : undefined,
      period,
      startDate,
      endDate,
      groupBy
    };

    const analytics = await RefundService.getRefundAnalytics(options, req.user);

    recordOperation('refund_analytics', 'success');

    logger.info('Refund analytics retrieved successfully', {
      storeId,
      period,
      totalRefunds: analytics.totalRefunds,
      totalAmount: analytics.totalAmount
    });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    recordOperation('refund_analytics', 'error');
    throw error;
  }
});

/**
 * Get Pending Approvals Controller
 * 
 * Retrieves refunds pending approval
 */
export const getPendingApprovals = asyncHandler(async (req, res) => {
  const { storeId, priority, assignedTo, page = 1, limit = 20 } = req.query;

  logger.info('Retrieving pending refund approvals', {
    storeId,
    priority,
    assignedTo,
    page,
    limit,
    userId: req.user?.id
  });

  recordOperation('refund_pending', 'start');

  try {
    const options = {
      storeId: storeId ? parseInt(storeId) : undefined,
      priority,
      assignedTo: assignedTo ? parseInt(assignedTo) : undefined,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const result = await RefundService.getPendingApprovals(options, req.user);

    recordOperation('refund_pending', 'success');

    logger.info('Pending approvals retrieved successfully', {
      storeId,
      pendingCount: result.refunds?.length || 0,
      totalPending: result.total
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    recordOperation('refund_pending', 'error');
    throw error;
  }
});

/**
 * Bulk Approve Refunds Controller
 * 
 * Approves multiple refunds in a single operation
 */
export const bulkApproveRefunds = asyncHandler(async (req, res) => {
  const { refundIds, approverComments } = req.body;

  // Input validation
  if (!refundIds || !Array.isArray(refundIds) || refundIds.length === 0) {
    throw new ValidationError('Refund IDs array is required and must not be empty');
  }

  // Validate all refund IDs
  for (const refundId of refundIds) {
    if (!refundId || isNaN(refundId)) {
      throw new ValidationError('All refund IDs must be valid numbers');
    }
  }

  logger.info('Bulk approving refunds', {
    refundCount: refundIds.length,
    refundIds,
    hasComments: !!approverComments,
    userId: req.user?.id
  });

  recordOperation('refund_bulk_approve', 'start');

  try {
    const approvalData = {
      refundIds: refundIds.map(id => parseInt(id)),
      approverComments: approverComments?.trim(),
      approvedBy: req.user?.id
    };

    const result = await RefundService.bulkApproveRefunds(approvalData, req.user);

    recordOperation('refund_bulk_approve', 'success');

    logger.info('Bulk approval completed', {
      totalRequested: refundIds.length,
      successCount: result.successful?.length || 0,
      failureCount: result.failed?.length || 0
    });

    res.json({
      success: true,
      message: 'Bulk refund approval completed',
      data: result
    });
  } catch (error) {
    recordOperation('refund_bulk_approve', 'error');
    throw error;
  }
});

/**
 * Cancel Refund Controller
 * 
 * Cancels a refund request
 */
export const cancelRefund = asyncHandler(async (req, res) => {
  const { refundId } = req.params;
  const { reason, notes } = req.body;

  // Input validation
  if (!refundId || isNaN(refundId)) {
    throw new ValidationError('Valid refund ID is required');
  }

  if (!reason || reason.trim().length === 0) {
    throw new ValidationError('Cancellation reason is required');
  }

  logger.info('Cancelling refund', {
    refundId,
    reason,
    hasNotes: !!notes,
    userId: req.user?.id
  });

  recordOperation('refund_cancel', 'start');

  try {
    const cancellationData = {
      reason: reason.trim(),
      notes: notes?.trim(),
      cancelledBy: req.user?.id
    };

    const refund = await RefundService.cancelRefund(refundId, cancellationData, req.user);

    recordOperation('refund_cancel', 'success');

    logger.info('Refund cancelled successfully', {
      refundId: refund.id,
      reason,
      previousStatus: refund.previousStatus
    });

    res.json({
      success: true,
      message: 'Refund cancelled successfully',
      data: refund
    });
  } catch (error) {
    recordOperation('refund_cancel', 'error');
    throw error;
  }
});
