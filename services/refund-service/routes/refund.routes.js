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
} from '../../shared/index.js';

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
  refundController.getRefundsByStore
);

// Get pending refund approvals
router.get('/pending',
  authenticate,
  refundController.getPendingApprovals
);

// Bulk approve refunds
router.post('/bulk-approve',
  authenticate,
  authorize(['manager', 'admin']),
  refundController.bulkApproveRefunds
);

// Get refund analytics
router.get('/analytics/summary',
  authenticate,
  refundController.getRefundAnalytics
);

// Get refunds by store
router.get('/store/:storeId',
  authenticate,
  validateId('storeId'),
  refundController.getRefundsByStore
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

// Process refund (complete the refund transaction)
router.post('/:refundId/process',
  authenticate,
  authorize(['manager', 'admin']),
  validateId('refundId'),
  refundController.processRefund
);

// Cancel refund request
router.delete('/:refundId',
  authenticate,
  validateId('refundId'),
  refundController.cancelRefund
);

export default router;
