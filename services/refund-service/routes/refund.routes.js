/**
 * Refund Routes for Refund Service
 * 
 * Defines all HTTP routes for refund-related operations in the microservices architecture.
 * These routes handle refund processing, approval workflows, and analytics.
 * 
 * Features:
 * - RESTful API design
 * - JWT authentication
 * - Input validation handled by controllers
 * - Comprehensive error handling
 * - Metrics collection
 * 
 * @author Refund Service Team
 * @version 1.0.0
 */

import express from 'express';

// Import shared middleware
import { 
  authenticate,
  authorize,
  validateId
} from '@log430/shared';

import * as refundController from '../controllers/refund.controller.js';

const router = express.Router();

/**
 * Refund Management Routes
 */

// Create a new refund request
router.post('/',
  authenticate,
  refundController.createRefund
);

// Get all refunds with pagination and filtering
router.get('/',
  authenticate,
  refundController.getAllRefunds
);

// Get refund by ID
router.get('/:refundId',
  authenticate,
  validateId('refundId'),
  refundController.getRefundById
);

// Update refund status
router.patch('/:refundId/status',
  authenticate,
  validateId('refundId'),
  refundController.updateRefundStatus
);

// Approve refund (manager only)
router.post('/:refundId/approve',
  authenticate,
  authorize(['manager', 'admin']),
  validateId('refundId'),
  refundController.approveRefund
);

// Reject refund (manager only)
router.post('/:refundId/reject',
  authenticate,
  authorize(['manager', 'admin']),
  validateId('refundId'),
  refundController.rejectRefund
);

// Cancel refund request
router.delete('/:refundId',
  authenticate,
  validateId('refundId'),
  refundController.cancelRefund
);

// Get refunds by store
router.get('/store/:storeId',
  authenticate,
  validateId('storeId'),
  refundController.getRefundsByStore
);

// Get refunds by customer
router.get('/customer/:customerId',
  authenticate,
  validateId('customerId'),
  refundController.getRefundsByCustomer
);

// Get refunds by sale
router.get('/sale/:saleId',
  authenticate,
  validateId('saleId'),
  refundController.getRefundsBySale
);

// Get refund analytics
router.get('/analytics/summary',
  authenticate,
  refundController.getRefundAnalytics
);

// Get refunds by date range
router.get('/analytics/range',
  authenticate,
  refundController.getRefundsByDateRange
);

// Get refund trends
router.get('/analytics/trends',
  authenticate,
  refundController.getRefundTrends
);

// Process refund (complete the refund transaction)
router.post('/:refundId/process',
  authenticate,
  authorize(['manager', 'admin']),
  validateId('refundId'),
  refundController.processRefund
);

export default router;
