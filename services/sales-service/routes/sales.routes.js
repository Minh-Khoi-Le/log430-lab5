/**
 * Sales Routes for Sales Service
 * 
 * Defines all HTTP routes for sales-related operations in the microservices architecture.
 * These routes handle transaction processing, sales history, and analytics.
 * 
 * Features:
 * - RESTful API design
 * - JWT authentication
 * - Input validation handled by controllers
 * - Comprehensive error handling
 * - Metrics collection
 * 
 * @author Sales Service Team
 * @version 1.0.0
 */

import express from 'express';

// Import shared middleware
import { 
  authenticate,
  authenticateApiKey,
  validateId
} from '../../shared/index.js';

import * as salesController from '../controllers/sales.controller.js';

const router = express.Router();

// Combined authentication middleware for internal and external calls
const authenticateOrApiKey = async (req, res, next) => {
  try {
    // Check if this is an API key request (service-to-service)
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      return authenticateApiKey(req, res, next);
    }
    
    // Otherwise, use JWT authentication
    return authenticate(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * Sales Transaction Routes
 */

// Create a new sale transaction
router.post('/',
  authenticate,
  salesController.createSale
);

// Get all sales with pagination and filtering
router.get('/',
  authenticate,
  salesController.getAllSales
);

// Get sale by ID
router.get('/:saleId',
  authenticate,
  validateId('saleId'),
  salesController.getSaleById
);

// Update sale status
router.patch('/:saleId/status',
  authenticateOrApiKey,
  validateId('saleId'),
  salesController.updateSaleStatus
);

// Cancel a sale
router.delete('/:saleId',
  authenticate,
  validateId('saleId'),
  salesController.cancelSale
);

// Get sales by store
router.get('/store/:storeId',
  authenticate,
  validateId('storeId'),
  salesController.getSalesByStore
);

// Get sales by customer
router.get('/customer/:customerId',
  authenticate,
  validateId('customerId'),
  salesController.getSalesByCustomer
);

// Get sales analytics
router.get('/analytics/summary',
  authenticate,
  salesController.getSalesAnalytics
);

// Get sales by date range
router.get('/analytics/range',
  authenticate,
  salesController.getSalesByDateRange
);

// Get sales trends
router.get('/analytics/trends',
  authenticate,
  salesController.getSalesTrends
);

// Process refund for a sale
router.post('/:saleId/refund',
  authenticate,
  validateId('saleId'),
  salesController.processSaleRefund
);

// Get sale receipts
router.get('/:saleId/receipt',
  authenticate,
  validateId('saleId'),
  salesController.getSaleReceipt
);

export default router;
