/**
 * Sales Routes for Sales Service
 * 
 * Defines all HTTP routes for sales-related operations in the microservices architecture.
 * These routes handle transaction processing, sales history, and analytics.
 * 
 * Features:
 * - RESTful API design
 * - JWT authentication
 * - Input validation
 * - Rate limiting
 * - Comprehensive error handling
 * - Metrics collection
 * 
 * @author Sales Service Team
 * @version 1.0.0
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { cacheMiddleware } from '../middleware/cache.js';
import * as salesController from '../controllers/sales.controller.js';

const router = express.Router();

/**
 * Sales Transaction Routes
 * 
 * Routes for managing sales transactions including creation,
 * retrieval, and status updates.
 */

/**
 * @route   POST /api/sales
 * @desc    Create a new sale transaction
 * @access  Private (requires authentication)
 * @body    {
 *   storeId: number,
 *   customerId?: number,
 *   items: Array<{
 *     productId: number,
 *     quantity: number,
 *     unitPrice: number,
 *     discount?: number
 *   }>,
 *   paymentMethod: string,
 *   totalAmount: number,
 *   taxAmount?: number,
 *   discountAmount?: number,
 *   notes?: string
 * }
 */
router.post('/',
  authenticateToken,
  validateRequest({
    body: {
      storeId: { type: 'number', required: true },
      customerId: { type: 'number', required: false },
      items: { 
        type: 'array', 
        required: true,
        minItems: 1,
        items: {
          type: 'object',
          properties: {
            productId: { type: 'number', required: true },
            quantity: { type: 'number', required: true, min: 1 },
            unitPrice: { type: 'number', required: true, min: 0 },
            discount: { type: 'number', required: false, min: 0 }
          }
        }
      },
      paymentMethod: { 
        type: 'string', 
        required: true,
        enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'GIFT_CARD', 'MOBILE_PAYMENT']
      },
      totalAmount: { type: 'number', required: true, min: 0 },
      taxAmount: { type: 'number', required: false, min: 0 },
      discountAmount: { type: 'number', required: false, min: 0 },
      notes: { type: 'string', required: false, maxLength: 500 }
    }
  }),
  salesController.createSale
);

/**
 * @route   GET /api/sales/store/:storeId
 * @desc    Get sales for a specific store with filtering and pagination
 * @access  Private (requires authentication)
 * @params  storeId: number
 * @query   {
 *   page?: number,
 *   limit?: number,
 *   startDate?: string (ISO date),
 *   endDate?: string (ISO date),
 *   status?: string,
 *   paymentMethod?: string,
 *   customerId?: number,
 *   employeeId?: number
 * }
 */
router.get('/store/:storeId',
  authenticateToken,
  validateRequest({
    params: {
      storeId: { type: 'number', required: true }
    },
    query: {
      page: { type: 'number', required: false, min: 1 },
      limit: { type: 'number', required: false, min: 1, max: 100 },
      startDate: { type: 'string', required: false },
      endDate: { type: 'string', required: false },
      status: { 
        type: 'string', 
        required: false,
        enum: ['COMPLETED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED']
      },
      paymentMethod: { 
        type: 'string', 
        required: false,
        enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'GIFT_CARD', 'MOBILE_PAYMENT']
      },
      customerId: { type: 'number', required: false },
      employeeId: { type: 'number', required: false }
    }
  }),
  cacheMiddleware(300), // Cache for 5 minutes
  salesController.getSalesByStore
);

/**
 * @route   GET /api/sales/:saleId/store/:storeId
 * @desc    Get a specific sale by ID
 * @access  Private (requires authentication)
 * @params  saleId: number, storeId: number
 */
router.get('/:saleId/store/:storeId',
  authenticateToken,
  validateRequest({
    params: {
      saleId: { type: 'number', required: true },
      storeId: { type: 'number', required: true }
    }
  }),
  cacheMiddleware(600), // Cache for 10 minutes
  salesController.getSaleById
);

/**
 * @route   PATCH /api/sales/:saleId/status
 * @desc    Update sale status
 * @access  Private (requires authentication)
 * @params  saleId: number
 * @body    { status: string }
 */
router.patch('/:saleId/status',
  authenticateToken,
  validateRequest({
    params: {
      saleId: { type: 'number', required: true }
    },
    body: {
      status: { 
        type: 'string', 
        required: true,
        enum: ['COMPLETED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED']
      }
    }
  }),
  salesController.updateSaleStatus
);

/**
 * Sales Analytics Routes
 * 
 * Routes for retrieving sales analytics and reporting data.
 */

/**
 * @route   GET /api/sales/analytics/store/:storeId
 * @desc    Get sales analytics for a store
 * @access  Private (requires authentication)
 * @params  storeId: number
 * @query   {
 *   startDate?: string (ISO date),
 *   endDate?: string (ISO date),
 *   groupBy?: string (hour|day|week|month)
 * }
 */
router.get('/analytics/store/:storeId',
  authenticateToken,
  validateRequest({
    params: {
      storeId: { type: 'number', required: true }
    },
    query: {
      startDate: { type: 'string', required: false },
      endDate: { type: 'string', required: false },
      groupBy: { 
        type: 'string', 
        required: false,
        enum: ['hour', 'day', 'week', 'month']
      }
    }
  }),
  cacheMiddleware(900), // Cache for 15 minutes
  salesController.getSalesAnalytics
);

/**
 * @route   GET /api/sales/analytics/store/:storeId/summary
 * @desc    Get sales summary analytics for a store
 * @access  Private (requires authentication)
 * @params  storeId: number
 * @query   {
 *   period?: string (today|week|month|quarter|year)
 * }
 */
router.get('/analytics/store/:storeId/summary',
  authenticateToken,
  validateRequest({
    params: {
      storeId: { type: 'number', required: true }
    },
    query: {
      period: { 
        type: 'string', 
        required: false,
        enum: ['today', 'week', 'month', 'quarter', 'year']
      }
    }
  }),
  cacheMiddleware(600), // Cache for 10 minutes
  salesController.getSalesSummary
);

/**
 * @route   GET /api/sales/analytics/store/:storeId/top-products
 * @desc    Get top-selling products for a store
 * @access  Private (requires authentication)
 * @params  storeId: number
 * @query   {
 *   startDate?: string (ISO date),
 *   endDate?: string (ISO date),
 *   limit?: number
 * }
 */
router.get('/analytics/store/:storeId/top-products',
  authenticateToken,
  validateRequest({
    params: {
      storeId: { type: 'number', required: true }
    },
    query: {
      startDate: { type: 'string', required: false },
      endDate: { type: 'string', required: false },
      limit: { type: 'number', required: false, min: 1, max: 50 }
    }
  }),
  cacheMiddleware(1800), // Cache for 30 minutes
  salesController.getTopProducts
);

/**
 * @route   GET /api/sales/analytics/store/:storeId/revenue-trends
 * @desc    Get revenue trends for a store
 * @access  Private (requires authentication)
 * @params  storeId: number
 * @query   {
 *   startDate?: string (ISO date),
 *   endDate?: string (ISO date),
 *   granularity?: string (hour|day|week|month)
 * }
 */
router.get('/analytics/store/:storeId/revenue-trends',
  authenticateToken,
  validateRequest({
    params: {
      storeId: { type: 'number', required: true }
    },
    query: {
      startDate: { type: 'string', required: false },
      endDate: { type: 'string', required: false },
      granularity: { 
        type: 'string', 
        required: false,
        enum: ['hour', 'day', 'week', 'month']
      }
    }
  }),
  cacheMiddleware(1200), // Cache for 20 minutes
  salesController.getRevenueTrends
);

/**
 * Customer Sales Routes
 * 
 * Routes for retrieving customer-specific sales data.
 */

/**
 * @route   GET /api/sales/customer/:customerId
 * @desc    Get sales history for a specific customer
 * @access  Private (requires authentication)
 * @params  customerId: number
 * @query   {
 *   page?: number,
 *   limit?: number,
 *   startDate?: string (ISO date),
 *   endDate?: string (ISO date),
 *   storeId?: number
 * }
 */
router.get('/customer/:customerId',
  authenticateToken,
  validateRequest({
    params: {
      customerId: { type: 'number', required: true }
    },
    query: {
      page: { type: 'number', required: false, min: 1 },
      limit: { type: 'number', required: false, min: 1, max: 100 },
      startDate: { type: 'string', required: false },
      endDate: { type: 'string', required: false },
      storeId: { type: 'number', required: false }
    }
  }),
  cacheMiddleware(600), // Cache for 10 minutes
  salesController.getCustomerSales
);

/**
 * Employee Sales Routes
 * 
 * Routes for retrieving employee-specific sales data.
 */

/**
 * @route   GET /api/sales/employee/:employeeId
 * @desc    Get sales made by a specific employee
 * @access  Private (requires authentication)
 * @params  employeeId: number
 * @query   {
 *   page?: number,
 *   limit?: number,
 *   startDate?: string (ISO date),
 *   endDate?: string (ISO date),
 *   storeId?: number
 * }
 */
router.get('/employee/:employeeId',
  authenticateToken,
  validateRequest({
    params: {
      employeeId: { type: 'number', required: true }
    },
    query: {
      page: { type: 'number', required: false, min: 1 },
      limit: { type: 'number', required: false, min: 1, max: 100 },
      startDate: { type: 'string', required: false },
      endDate: { type: 'string', required: false },
      storeId: { type: 'number', required: false }
    }
  }),
  cacheMiddleware(600), // Cache for 10 minutes
  salesController.getEmployeeSales
);

/**
 * Bulk Operations Routes
 * 
 * Routes for handling bulk sales operations.
 */

/**
 * @route   POST /api/sales/bulk
 * @desc    Create multiple sales transactions
 * @access  Private (requires authentication)
 * @body    {
 *   sales: Array<SaleData>
 * }
 */
router.post('/bulk',
  authenticateToken,
  validateRequest({
    body: {
      sales: {
        type: 'array',
        required: true,
        minItems: 1,
        maxItems: 100,
        items: {
          type: 'object',
          properties: {
            storeId: { type: 'number', required: true },
            customerId: { type: 'number', required: false },
            items: { 
              type: 'array', 
              required: true,
              minItems: 1
            },
            paymentMethod: { type: 'string', required: true },
            totalAmount: { type: 'number', required: true, min: 0 }
          }
        }
      }
    }
  }),
  salesController.createBulkSales
);

/**
 * Integration Routes
 * 
 * Routes for integration with other services.
 */

/**
 * @route   POST /api/sales/cart-checkout
 * @desc    Process cart checkout to create sale
 * @access  Private (requires authentication)
 * @body    {
 *   cartId: string,
 *   storeId: number,
 *   paymentMethod: string,
 *   paymentDetails: object
 * }
 */
router.post('/cart-checkout',
  authenticateToken,
  validateRequest({
    body: {
      cartId: { type: 'string', required: true },
      storeId: { type: 'number', required: true },
      paymentMethod: { 
        type: 'string', 
        required: true,
        enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'GIFT_CARD', 'MOBILE_PAYMENT']
      },
      paymentDetails: { type: 'object', required: false }
    }
  }),
  salesController.processCartCheckout
);

export default router;
