/**
 * Refund Service
 * 
 * Core business logic for refund operations in the microservices architecture.
 * This service handles refund processing, approval workflows, and analytics.
 * 
 * Features:
 * - Refund request validation and processing
 * - Multi-level approval workflows
 * - Integration with sales and stock services
 * - Refund analytics and reporting
 * - Cache management for performance
 * - Comprehensive audit logging
 * 
 * @author Refund Service Team
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import { getRedisClient } from '../utils/redis.js';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * Refund Service Class
 * 
 * Encapsulates all business logic for refund operations
 */
class RefundService {
  
  /**
   * Create a new refund request
   * 
   * @param {Object} refundData - Refund request data
   * @param {number} refundData.saleId - ID of the original sale
   * @param {number} refundData.amount - Refund amount
   * @param {string} refundData.reason - Reason for refund
   * @param {string} refundData.refundType - Type of refund (FULL, PARTIAL, EXCHANGE)
   * @param {Array} refundData.items - Items being refunded (for partial refunds)
   * @param {string} refundData.notes - Additional notes
   * @param {string} refundData.customerEmail - Customer email for notifications
   * @param {number} refundData.requestedBy - ID of user requesting refund
   * @param {Object} userInfo - Information about the user creating the refund
   * @returns {Promise<Object>} Created refund request
   */
  async createRefund(refundData, userInfo) {
    const timer = logger.startTimer();
    
    try {
      logger.info('Creating new refund request', {
        saleId: refundData.saleId,
        amount: refundData.amount,
        refundType: refundData.refundType,
        userId: userInfo.id
      });

      // Validate required fields
      this.validateRefundData(refundData);

      // Get original sale details
      const sale = await this.getOriginalSale(refundData.saleId);

      // Validate refund eligibility
      await this.validateRefundEligibility(sale, refundData);

      // Calculate refund amounts and validate
      const calculatedAmounts = await this.calculateRefundAmounts(sale, refundData);
      this.validateRefundAmounts(refundData, calculatedAmounts);

      // Create the refund request
      const refund = await prisma.$transaction(async (tx) => {
        // Create the main refund record
        const newRefund = await tx.refund.create({
          data: {
            saleId: refundData.saleId,
            amount: refundData.amount,
            reason: refundData.reason,
            refundType: refundData.refundType,
            status: this.determineInitialStatus(refundData.amount, sale.totalAmount),
            notes: refundData.notes || null,
            requestedBy: refundData.requestedBy,
            requestedAt: new Date(),
            customerEmail: refundData.customerEmail,
            priority: this.calculateRefundPriority(refundData.amount, refundData.reason),
            metadata: {
              createdBy: userInfo.id,
              originalSaleAmount: sale.totalAmount,
              channel: 'POS',
              version: '1.0'
            }
          }
        });

        // Create refund items if partial refund
        if (refundData.refundType === 'PARTIAL' && refundData.items) {
          await Promise.all(
            refundData.items.map(item => 
              tx.refundItem.create({
                data: {
                  refundId: newRefund.id,
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.quantity * item.unitPrice,
                  reason: item.reason || refundData.reason
                }
              })
            )
          );
        }

        // Create status history entry
        await tx.refundStatusHistory.create({
          data: {
            refundId: newRefund.id,
            status: newRefund.status,
            changedBy: userInfo.id,
            changedAt: new Date(),
            notes: 'Refund request created'
          }
        });

        return newRefund;
      });

      // Update sale status if necessary
      await this.updateSaleRefundStatus(refundData.saleId, refund);

      // Send notification if required
      await this.sendRefundNotification(refund, 'CREATED');

      // Invalidate relevant caches
      await this.invalidateRelevantCaches(sale.storeId, refundData.saleId);

      // Get full refund details for response
      const fullRefund = await this.getRefundById(refund.id);

      logger.info('Refund request created successfully', {
        refundId: refund.id,
        saleId: refundData.saleId,
        amount: refundData.amount,
        status: refund.status,
        duration: timer.getDuration()
      });

      return fullRefund;

    } catch (error) {
      logger.error('Error creating refund request', {
        error: error.message,
        saleId: refundData.saleId,
        amount: refundData.amount,
        userId: userInfo.id,
        duration: timer.getDuration()
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'Failed to create refund request', 'REFUND_CREATION_FAILED');
    }
  }

  /**
   * Get refunds by store with filtering and pagination
   * 
   * @param {number} storeId - Store ID
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Refunds data with pagination info
   */
  async getRefundsByStore(storeId, filters = {}, pagination = {}) {
    const timer = logger.startTimer();
    
    try {
      const cacheKey = `refunds:store:${storeId}:${JSON.stringify(filters)}:${JSON.stringify(pagination)}`;
      
      // Try to get from cache first
      const cachedResult = await this.getCachedResult(cacheKey);
      if (cachedResult) {
        logger.info('Refunds data retrieved from cache', { storeId, cacheKey });
        return cachedResult;
      }

      // Build query filters
      const where = {
        sale: {
          storeId: storeId
        },
        ...this.buildRefundFilters(filters)
      };

      // Get total count
      const totalCount = await prisma.refund.count({ where });

      // Get paginated results
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      const refunds = await prisma.refund.findMany({
        where,
        include: {
          sale: {
            select: {
              id: true,
              storeId: true,
              totalAmount: true,
              saleDate: true,
              paymentMethod: true,
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true
                }
              }
            }
          },
          requestedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          approvedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          statusHistory: {
            orderBy: {
              changedAt: 'desc'
            },
            take: 5
          }
        },
        orderBy: [
          { priority: 'desc' },
          { requestedAt: 'desc' }
        ],
        skip: offset,
        take: limit
      });

      const result = {
        refunds,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPreviousPage: page > 1
        }
      };

      // Cache the result for 5 minutes
      await this.setCachedResult(cacheKey, result, 300);

      logger.info('Refunds data retrieved successfully', {
        storeId,
        count: refunds.length,
        totalCount,
        duration: timer.getDuration()
      });

      return result;

    } catch (error) {
      logger.error('Error retrieving refunds data', {
        error: error.message,
        storeId,
        filters,
        duration: timer.getDuration()
      });
      
      throw new ApiError(500, 'Failed to retrieve refunds data', 'REFUNDS_RETRIEVAL_FAILED');
    }
  }

  /**
   * Get refund by ID with full details
   * 
   * @param {number} refundId - Refund ID
   * @returns {Promise<Object>} Refund details
   */
  async getRefundById(refundId) {
    const timer = logger.startTimer();
    
    try {
      const cacheKey = `refund:${refundId}`;
      
      // Try cache first
      const cachedRefund = await this.getCachedResult(cacheKey);
      if (cachedRefund) {
        return cachedRefund;
      }

      const refund = await prisma.refund.findUnique({
        where: { id: refundId },
        include: {
          sale: {
            include: {
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      sku: true,
                      price: true
                    }
                  }
                }
              },
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true
                }
              }
            }
          },
          requestedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          approvedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          processedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          statusHistory: {
            include: {
              changedByUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            },
            orderBy: {
              changedAt: 'desc'
            }
          }
        }
      });

      if (!refund) {
        throw new ApiError(404, 'Refund not found', 'REFUND_NOT_FOUND');
      }

      // Cache for 10 minutes
      await this.setCachedResult(cacheKey, refund, 600);

      logger.info('Refund retrieved successfully', {
        refundId,
        saleId: refund.saleId,
        status: refund.status,
        duration: timer.getDuration()
      });

      return refund;

    } catch (error) {
      logger.error('Error retrieving refund', {
        error: error.message,
        refundId,
        duration: timer.getDuration()
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'Failed to retrieve refund', 'REFUND_RETRIEVAL_FAILED');
    }
  }

  /**
   * Update refund status
   * 
   * @param {number} refundId - Refund ID
   * @param {string} status - New status
   * @param {string} notes - Status change notes
   * @param {Object} userInfo - User information
   * @returns {Promise<Object>} Updated refund
   */
  async updateRefundStatus(refundId, status, notes, userInfo) {
    const timer = logger.startTimer();
    
    try {
      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'];
      
      if (!validStatuses.includes(status)) {
        throw new ApiError(400, 'Invalid refund status', 'INVALID_STATUS');
      }

      // Get current refund
      const currentRefund = await this.getRefundById(refundId);

      // Validate status transition
      this.validateStatusTransition(currentRefund.status, status);

      // Update refund in transaction
      const refund = await prisma.$transaction(async (tx) => {
        // Update main refund record
        const updatedRefund = await tx.refund.update({
          where: { id: refundId },
          data: {
            status,
            ...(status === 'APPROVED' && { approvedBy: userInfo.id, approvedAt: new Date() }),
            ...(status === 'COMPLETED' && { processedBy: userInfo.id, processedAt: new Date() }),
            updatedAt: new Date()
          }
        });

        // Add status history entry
        await tx.refundStatusHistory.create({
          data: {
            refundId,
            status,
            changedBy: userInfo.id,
            changedAt: new Date(),
            notes: notes || `Status changed to ${status}`
          }
        });

        return updatedRefund;
      });

      // Handle status-specific actions
      await this.handleStatusChangeActions(refund, status, userInfo);

      // Invalidate caches
      await this.invalidateRelevantCaches(currentRefund.sale.storeId, currentRefund.saleId, refundId);

      // Get updated refund with full details
      const fullRefund = await this.getRefundById(refundId);

      logger.info('Refund status updated successfully', {
        refundId,
        oldStatus: currentRefund.status,
        newStatus: status,
        userId: userInfo.id,
        duration: timer.getDuration()
      });

      return fullRefund;

    } catch (error) {
      logger.error('Error updating refund status', {
        error: error.message,
        refundId,
        status,
        userId: userInfo.id,
        duration: timer.getDuration()
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'Failed to update refund status', 'STATUS_UPDATE_FAILED');
    }
  }

  /**
   * Process refund (execute the actual refund)
   * 
   * @param {number} refundId - Refund ID
   * @param {Object} processData - Processing data
   * @returns {Promise<Object>} Processed refund
   */
  async processRefund(refundId, processData) {
    const timer = logger.startTimer();
    
    try {
      const refund = await this.getRefundById(refundId);

      if (refund.status !== 'APPROVED') {
        throw new ApiError(400, 'Refund must be approved before processing', 'REFUND_NOT_APPROVED');
      }

      // Process the refund
      const processedRefund = await prisma.$transaction(async (tx) => {
        // Update refund with processing details
        const updated = await tx.refund.update({
          where: { id: refundId },
          data: {
            status: 'COMPLETED',
            processedBy: processData.processedBy,
            processedAt: new Date(),
            paymentMethod: processData.paymentMethod,
            transactionId: processData.transactionDetails?.transactionId,
            metadata: {
              ...refund.metadata,
              paymentDetails: processData.transactionDetails,
              processedAt: new Date().toISOString()
            }
          }
        });

        // Add status history
        await tx.refundStatusHistory.create({
          data: {
            refundId,
            status: 'COMPLETED',
            changedBy: processData.processedBy,
            changedAt: new Date(),
            notes: 'Refund processed and completed'
          }
        });

        return updated;
      });

      // Handle stock restoration if needed
      if (refund.refundType === 'FULL' || refund.refundType === 'PARTIAL') {
        await this.restoreStock(refund);
      }

      // Update sale status
      await this.updateSaleRefundStatus(refund.saleId, processedRefund);

      // Send completion notification
      await this.sendRefundNotification(processedRefund, 'COMPLETED');

      // Invalidate caches
      await this.invalidateRelevantCaches(refund.sale.storeId, refund.saleId, refundId);

      logger.info('Refund processed successfully', {
        refundId,
        amount: refund.amount,
        paymentMethod: processData.paymentMethod,
        duration: timer.getDuration()
      });

      return await this.getRefundById(refundId);

    } catch (error) {
      logger.error('Error processing refund', {
        error: error.message,
        refundId,
        processData,
        duration: timer.getDuration()
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'Failed to process refund', 'REFUND_PROCESSING_FAILED');
    }
  }

  /**
   * Get refund analytics for a store
   * 
   * @param {number} storeId - Store ID
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Refund analytics data
   */
  async getRefundAnalytics(storeId, options = {}) {
    const timer = logger.startTimer();
    
    try {
      const { startDate, endDate, groupBy = 'day' } = options;
      const cacheKey = `analytics:refunds:${storeId}:${startDate}:${endDate}:${groupBy}`;
      
      // Try cache first
      const cachedAnalytics = await this.getCachedResult(cacheKey);
      if (cachedAnalytics) {
        return cachedAnalytics;
      }

      // Build date filters
      const dateFilter = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);

      const whereClause = {
        sale: { storeId },
        ...(Object.keys(dateFilter).length > 0 && { requestedAt: dateFilter })
      };

      // Get basic analytics
      const [totalRefunds, refundCount, avgRefundAmount] = await Promise.all([
        prisma.refund.aggregate({
          where: whereClause,
          _sum: { amount: true }
        }),
        prisma.refund.count({ where: whereClause }),
        prisma.refund.aggregate({
          where: whereClause,
          _avg: { amount: true }
        })
      ]);

      // Get refunds by status
      const refundsByStatus = await prisma.refund.groupBy({
        by: ['status'],
        where: whereClause,
        _sum: { amount: true },
        _count: { id: true }
      });

      // Get refunds by reason
      const refundsByReason = await prisma.refund.groupBy({
        by: ['reason'],
        where: whereClause,
        _sum: { amount: true },
        _count: { id: true },
        orderBy: {
          _sum: { amount: 'desc' }
        }
      });

      // Get time-based analytics
      const timeBasedRefunds = await this.getTimeBasedRefunds(whereClause, groupBy);

      const analytics = {
        summary: {
          totalRefundAmount: totalRefunds._sum.amount || 0,
          totalRefunds: refundCount,
          averageRefundAmount: avgRefundAmount._avg.amount || 0,
          currency: 'CAD'
        },
        byStatus: refundsByStatus,
        byReason: refundsByReason,
        timeSeries: timeBasedRefunds,
        generatedAt: new Date().toISOString()
      };

      // Cache for 15 minutes
      await this.setCachedResult(cacheKey, analytics, 900);

      logger.info('Refund analytics generated successfully', {
        storeId,
        totalRefunds: analytics.summary.totalRefunds,
        totalAmount: analytics.summary.totalRefundAmount,
        duration: timer.getDuration()
      });

      return analytics;

    } catch (error) {
      logger.error('Error generating refund analytics', {
        error: error.message,
        storeId,
        options,
        duration: timer.getDuration()
      });
      
      throw new ApiError(500, 'Failed to generate refund analytics', 'ANALYTICS_GENERATION_FAILED');
    }
  }

  // === PRIVATE HELPER METHODS ===

  /**
   * Validate refund data
   */
  validateRefundData(refundData) {
    const required = ['saleId', 'amount', 'reason', 'refundType'];
    const missing = required.filter(field => !refundData[field]);
    
    if (missing.length > 0) {
      throw new ApiError(400, `Missing required fields: ${missing.join(', ')}`, 'VALIDATION_ERROR');
    }

    if (refundData.amount <= 0) {
      throw new ApiError(400, 'Refund amount must be greater than zero', 'VALIDATION_ERROR');
    }

    const validTypes = ['FULL', 'PARTIAL', 'EXCHANGE'];
    if (!validTypes.includes(refundData.refundType)) {
      throw new ApiError(400, 'Invalid refund type', 'VALIDATION_ERROR');
    }

    if (refundData.refundType === 'PARTIAL' && (!refundData.items || refundData.items.length === 0)) {
      throw new ApiError(400, 'Partial refunds must specify items', 'VALIDATION_ERROR');
    }
  }

  /**
   * Get original sale details
   */
  async getOriginalSale(saleId) {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: {
            product: true
          }
        },
        refunds: true
      }
    });

    if (!sale) {
      throw new ApiError(404, 'Original sale not found', 'SALE_NOT_FOUND');
    }

    return sale;
  }

  /**
   * Validate refund eligibility
   */
  async validateRefundEligibility(sale, refundData) {
    // Check if sale is eligible for refund
    if (sale.status === 'CANCELLED') {
      throw new ApiError(400, 'Cannot refund a cancelled sale', 'REFUND_NOT_ALLOWED');
    }

    // Check refund time limits (e.g., 30 days)
    const refundCutoff = new Date();
    refundCutoff.setDate(refundCutoff.getDate() - 30);
    
    if (sale.saleDate < refundCutoff) {
      throw new ApiError(400, 'Sale is too old for refund (30 day limit)', 'REFUND_EXPIRED');
    }

    // Check if already fully refunded
    const totalRefunded = sale.refunds
      .filter(r => r.status === 'COMPLETED')
      .reduce((sum, r) => sum + r.amount, 0);

    if (totalRefunded >= sale.totalAmount) {
      throw new ApiError(400, 'Sale has already been fully refunded', 'ALREADY_REFUNDED');
    }

    // Check if requested amount would exceed remaining refundable amount
    const remainingRefundable = sale.totalAmount - totalRefunded;
    if (refundData.amount > remainingRefundable) {
      throw new ApiError(400, 
        `Refund amount exceeds remaining refundable amount. Available: ${remainingRefundable}`, 
        'REFUND_AMOUNT_EXCEEDED'
      );
    }
  }

  /**
   * Calculate refund amounts
   */
  async calculateRefundAmounts(sale, refundData) {
    if (refundData.refundType === 'FULL') {
      return {
        amount: sale.totalAmount,
        tax: sale.taxAmount || 0,
        subtotal: sale.totalAmount - (sale.taxAmount || 0)
      };
    }

    // For partial refunds, calculate based on items
    let subtotal = 0;
    if (refundData.items) {
      subtotal = refundData.items.reduce((sum, item) => 
        sum + (item.quantity * item.unitPrice), 0
      );
    } else {
      subtotal = refundData.amount / 1.15; // Assuming 15% tax
    }

    return {
      amount: refundData.amount,
      tax: subtotal * 0.15,
      subtotal
    };
  }

  /**
   * Validate refund amounts
   */
  validateRefundAmounts(refundData, calculated) {
    const tolerance = 0.01; // 1 cent tolerance
    
    if (Math.abs(refundData.amount - calculated.amount) > tolerance) {
      throw new ApiError(400, 'Refund amount does not match calculated total', 'AMOUNT_MISMATCH');
    }
  }

  /**
   * Determine initial status based on amount and policies
   */
  determineInitialStatus(refundAmount, saleAmount) {
    // Large refunds or full refunds require approval
    if (refundAmount > 100 || refundAmount === saleAmount) {
      return 'PENDING';
    }
    
    // Small refunds can be auto-approved
    return 'APPROVED';
  }

  /**
   * Calculate refund priority
   */
  calculateRefundPriority(amount, reason) {
    let priority = 1; // Normal priority
    
    // High priority for large amounts
    if (amount > 500) priority = 3;
    else if (amount > 100) priority = 2;
    
    // Higher priority for certain reasons
    const highPriorityReasons = ['DEFECTIVE', 'WRONG_ITEM', 'DAMAGED'];
    if (highPriorityReasons.includes(reason)) {
      priority += 1;
    }
    
    return Math.min(priority, 3); // Max priority is 3
  }

  /**
   * Validate status transition
   */
  validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'PENDING': ['APPROVED', 'REJECTED', 'CANCELLED'],
      'APPROVED': ['COMPLETED', 'CANCELLED'],
      'REJECTED': ['PENDING'], // Can be reconsidered
      'COMPLETED': [], // Final state
      'CANCELLED': [] // Final state
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new ApiError(400, 
        `Invalid status transition from ${currentStatus} to ${newStatus}`, 
        'INVALID_STATUS_TRANSITION'
      );
    }
  }

  /**
   * Handle status change actions
   */
  async handleStatusChangeActions(refund, status, userInfo) {
    switch (status) {
      case 'APPROVED':
        await this.sendRefundNotification(refund, 'APPROVED');
        break;
      case 'REJECTED':
        await this.sendRefundNotification(refund, 'REJECTED');
        break;
      case 'COMPLETED':
        await this.sendRefundNotification(refund, 'COMPLETED');
        break;
    }
  }

  /**
   * Restore stock for refunded items
   */
  async restoreStock(refund) {
    try {
      const stockServiceUrl = process.env.STOCK_SERVICE_URL || 'http://localhost:3003';
      
      let stockUpdates = [];
      
      if (refund.refundType === 'FULL') {
        // Restore all items from the original sale
        stockUpdates = refund.sale.items.map(item => ({
          productId: item.productId,
          storeId: refund.sale.storeId,
          quantityChange: item.quantity, // Positive for restoration
          reason: 'REFUND',
          reference: `refund-${refund.id}`
        }));
      } else if (refund.refundType === 'PARTIAL' && refund.items) {
        // Restore only refunded items
        stockUpdates = refund.items.map(item => ({
          productId: item.productId,
          storeId: refund.sale.storeId,
          quantityChange: item.quantity,
          reason: 'REFUND',
          reference: `refund-${refund.id}`
        }));
      }

      if (stockUpdates.length > 0) {
        await axios.post(`${stockServiceUrl}/api/stock/bulk-update`, {
          updates: stockUpdates
        });
      }

    } catch (error) {
      logger.error('Failed to restore stock for refund', {
        error: error.message,
        refundId: refund.id,
        refundType: refund.refundType
      });
      
      // Don't fail the refund if stock restoration fails
      // This should be handled by a retry mechanism or manual intervention
    }
  }

  /**
   * Update sale refund status
   */
  async updateSaleRefundStatus(saleId, refund) {
    try {
      // Get all refunds for this sale
      const saleRefunds = await prisma.refund.findMany({
        where: { saleId, status: 'COMPLETED' }
      });

      const totalRefunded = saleRefunds.reduce((sum, r) => sum + r.amount, 0);
      
      // Get original sale
      const sale = await prisma.sale.findUnique({
        where: { id: saleId }
      });

      if (!sale) return;

      let newSaleStatus = sale.status;
      
      if (totalRefunded >= sale.totalAmount) {
        newSaleStatus = 'REFUNDED';
      } else if (totalRefunded > 0) {
        newSaleStatus = 'PARTIALLY_REFUNDED';
      }

      if (newSaleStatus !== sale.status) {
        // Call sales service to update status
        const salesServiceUrl = process.env.SALES_SERVICE_URL || 'http://localhost:3004';
        await axios.patch(`${salesServiceUrl}/api/sales/${saleId}/status`, {
          status: newSaleStatus
        });
      }

    } catch (error) {
      logger.error('Failed to update sale refund status', {
        error: error.message,
        saleId,
        refundId: refund.id
      });
    }
  }

  /**
   * Send refund notifications
   */
  async sendRefundNotification(refund, eventType) {
    try {
      // In a real implementation, this would integrate with an email service
      logger.info('Refund notification sent', {
        refundId: refund.id,
        eventType,
        customerEmail: refund.customerEmail
      });
    } catch (error) {
      logger.error('Failed to send refund notification', {
        error: error.message,
        refundId: refund.id,
        eventType
      });
    }
  }

  /**
   * Build refund filters
   */
  buildRefundFilters(filters) {
    const where = {};
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.refundType) {
      where.refundType = filters.refundType;
    }
    
    if (filters.startDate) {
      where.requestedAt = { ...where.requestedAt, gte: new Date(filters.startDate) };
    }
    
    if (filters.endDate) {
      where.requestedAt = { ...where.requestedAt, lte: new Date(filters.endDate) };
    }
    
    if (filters.reason) {
      where.reason = filters.reason;
    }
    
    if (filters.requestedBy) {
      where.requestedBy = filters.requestedBy;
    }
    
    if (filters.approvedBy) {
      where.approvedBy = filters.approvedBy;
    }
    
    return where;
  }

  /**
   * Get time-based refunds data
   */
  async getTimeBasedRefunds(whereClause, groupBy) {
    // This is a simplified version - in production you'd use proper SQL aggregation
    const refunds = await prisma.refund.findMany({
      where: whereClause,
      select: {
        requestedAt: true,
        amount: true,
        status: true
      },
      orderBy: {
        requestedAt: 'asc'
      }
    });

    // Group refunds by time period
    const grouped = {};
    
    refunds.forEach(refund => {
      let key;
      const date = new Date(refund.requestedAt);
      
      switch (groupBy) {
        case 'hour':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          break;
        case 'week': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-W${String(Math.ceil(weekStart.getDate() / 7)).padStart(2, '0')}`;
          break;
        }
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      }
      
      if (!grouped[key]) {
        grouped[key] = { amount: 0, count: 0, completedCount: 0 };
      }
      
      grouped[key].amount += refund.amount;
      grouped[key].count += 1;
      if (refund.status === 'COMPLETED') {
        grouped[key].completedCount += 1;
      }
    });

    return Object.entries(grouped).map(([period, data]) => ({
      period,
      refundAmount: data.amount,
      refundCount: data.count,
      completedCount: data.completedCount
    }));
  }

  /**
   * Cache management methods
   */
  async getCachedResult(key) {
    try {
      const redis = getRedisClient();
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.warn('Cache retrieval failed', { key, error: error.message });
      return null;
    }
  }

  async setCachedResult(key, data, ttl = 300) {
    try {
      const redis = getRedisClient();
      await redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      logger.warn('Cache storage failed', { key, error: error.message });
    }
  }

  async invalidateRelevantCaches(storeId, saleId = null, refundId = null) {
    try {
      const redis = getRedisClient();
      const patterns = [
        `refunds:store:${storeId}:*`,
        `analytics:refunds:${storeId}:*`
      ];
      
      if (saleId) {
        patterns.push(`sale:${saleId}:*`);
      }
      
      if (refundId) {
        patterns.push(`refund:${refundId}`);
      }
      
      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }
    } catch (error) {
      logger.warn('Cache invalidation failed', { storeId, saleId, refundId, error: error.message });
    }
  }

  /**
   * Additional convenience methods
   */

  async getPendingApprovals(filters = {}, pagination = {}) {
    const enhancedFilters = {
      ...filters,
      status: 'PENDING'
    };

    return this.getRefundsByStore(filters.storeId || null, enhancedFilters, pagination);
  }

  async bulkApproveRefunds(refundIds, notes, userInfo) {
    const results = {
      processed: refundIds.length,
      successful: [],
      failed: []
    };

    for (const refundId of refundIds) {
      try {
        const refund = await this.updateRefundStatus(refundId, 'APPROVED', notes, userInfo);
        results.successful.push({ refundId, refund });
      } catch (error) {
        results.failed.push({ refundId, error: error.message });
      }
    }

    return results;
  }

  async cancelRefund(refundId, reason, userInfo) {
    return this.updateRefundStatus(refundId, 'CANCELLED', reason, userInfo);
  }
}

export default new RefundService();
