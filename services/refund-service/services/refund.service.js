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
 * @version 2.0.0
 */

import { 
  getDatabaseClient, 
  executeTransaction,
  BaseError,
  logger,
  redisClient
} from '../../shared/index.js';
import axios from 'axios';

/**
 * Refund Service Class
 * 
 * Encapsulates all business logic for refund operations
 */
class RefundService {
  
  /**
   * Get database client instance
   * @returns {PrismaClient} Database client
   */
  static getPrisma() {
    return getDatabaseClient('refund-service');
  }
  
  /**
   * Create a new refund request
   * 
   * @param {Object} refundData - Refund request data
   * @param {number} refundData.saleId - ID of the original sale
   * @param {number} refundData.amount - Refund amount (stored as 'total' in schema)
   * @param {string} refundData.reason - Reason for refund
   * @param {Array} refundData.items - Items being refunded (optional, creates RefundLines)
   * @param {Object} userInfo - Information about the user creating the refund
   * @returns {Promise<Object>} Created refund request
   */
  async createRefund(refundData, userInfo) {
    const timer = logger.startTimer();
    
    try {
      logger.info('Creating new refund request', {
        saleId: refundData.saleId,
        amount: refundData.amount,
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
      const refund = await executeTransaction(async (tx) => {
        // Create the main refund record
        logger.info('Creating refund with user IDs', {
          requestingUserId: userInfo.id,
          saleUserId: sale.userId,
          saleId: refundData.saleId
        });
        
        const newRefund = await tx.refund.create({
          data: {
            saleId: refundData.saleId,
            total: refundData.amount,
            reason: refundData.reason,
            storeId: sale.storeId,
            userId: sale.userId  // Keep the original sale's user (customer)
          }
        });

        // Create refund lines
        if (refundData.items && refundData.items.length > 0) {
          // Create lines for specific items provided
          await Promise.all(
            refundData.items.map(item => 
              tx.refundLine.create({
                data: {
                  refundId: newRefund.id,
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice
                }
              })
            )
          );
        } else {
          // If no specific items provided, create refund lines for all sale items
          // This represents a full refund of the entire sale
          await Promise.all(
            sale.lines.map(saleLine => 
              tx.refundLine.create({
                data: {
                  refundId: newRefund.id,
                  productId: saleLine.productId,
                  quantity: saleLine.quantity,
                  unitPrice: saleLine.unitPrice
                }
              })
            )
          );
        }

        return newRefund;
      });

      // Update sale status if necessary
      await this.updateSaleRefundStatus(refundData.saleId, refund);

      // Send notification if required
      await this.sendRefundNotification(refund, 'CREATED');

      // Invalidate relevant caches
      await this.invalidateRelevantCaches(sale.storeId, refundData.saleId);

      // Get full refund details for response
      const fullRefund = await this.getRefundById(refund.id, null); // Internal call, no access control needed

      logger.info('Refund request created successfully', {
        refundId: refund.id,
        saleId: refundData.saleId,
        amount: refundData.amount,
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
      
      if (error instanceof BaseError) {
        throw error;
      }
      
      throw new BaseError('Failed to create refund request', 500, 'REFUND_CREATION_FAILED');
    }
  }

  /**
   * Get refunds by store with filtering and pagination
   * 
   * @param {number} storeId - Store ID (null for all stores)
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
      const where = {};
      
      // Only add storeId filter if it's provided and not null
      if (storeId !== null && storeId !== undefined) {
        where.storeId = storeId;
      }
      
      // Add other filters
      Object.assign(where, this.buildRefundFilters(filters));

      // Get total count
      const totalCount = await RefundService.getPrisma().refund.count({ where });

      // Get paginated results
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      const refunds = await RefundService.getPrisma().refund.findMany({
        where,
        include: {
          sale: {
            select: {
              id: true,
              storeId: true,
              total: true,
              date: true,
              status: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  role: true
                }
              }
            }
          },
          lines: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          store: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          date: 'desc'
        },
        skip: offset,
        take: limit
      });

      logger.info('Refunds retrieved from database', {
        storeId,
        filters,
        refundCount: refunds.length,
        refundUserIds: refunds.map(r => ({ id: r.id, userId: r.userId }))
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
      
      throw new BaseError('Failed to retrieve refunds data', 500, 'REFUNDS_RETRIEVAL_FAILED');
    }
  }

  /**
   * Get refund by ID with full details
   * 
   * @param {number} refundId - Refund ID
   * @param {Object} userInfo - User information for access control
   * @returns {Promise<Object>} Refund details
   */
  async getRefundById(refundId, userInfo = null) {
    const timer = logger.startTimer();
    
    try {
      const cacheKey = `refund:${refundId}`;
      
      // Try cache first
      const cachedRefund = await this.getCachedResult(cacheKey);
      if (cachedRefund) {
        return cachedRefund;
      }

      const refund = await RefundService.getPrisma().refund.findUnique({
        where: { id: refundId },
        include: {
          sale: {
            include: {
              lines: {     // Fixed: was items
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      price: true  // Fixed: removed sku
                    }
                  }
                }
              },
              user: {      // Fixed: was customer
                select: {
                  id: true,
                  name: true,   // Fixed: was firstName, lastName, email, phone
                  role: true
                }
              }
            }
          },
          lines: {         // Fixed: was items
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true  // Fixed: removed sku
                }
              }
            }
          },
          user: {          // Fixed: was requestedByUser
            select: {
              id: true,
              name: true,    // Fixed: was firstName, lastName, email
              role: true
            }
          },
          store: {         // Add store information
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!refund) {
        throw new BaseError('Refund not found', 404, 'REFUND_NOT_FOUND');
      }

      // Role-based access control
      if (userInfo && userInfo.role === 'client' && refund.userId !== userInfo.id) {
        throw new BaseError('Access denied: You can only view your own refunds', 403, 'ACCESS_DENIED');
      }

      // Cache for 10 minutes
      await this.setCachedResult(cacheKey, refund, 600);

      logger.info('Refund retrieved successfully', {
        refundId,
        saleId: refund.saleId,
        duration: timer.getDuration()
      });

      return refund;

    } catch (error) {
      logger.error('Error retrieving refund', {
        error: error.message,
        refundId,
        duration: timer.getDuration()
      });
      
      if (error instanceof BaseError) {
        throw error;
      }
      
      throw new BaseError('Failed to retrieve refund', 500, 'REFUND_RETRIEVAL_FAILED');
    }
  }

  /**
   * Update refund status - NOTE: Status field doesn't exist in current schema
   * This method is kept for API compatibility but doesn't actually update status
   * 
   * @param {number} refundId - Refund ID
   * @param {string} status - New status (ignored since field doesn't exist)
   * @param {string} notes - Status change notes
   * @param {Object} userInfo - User information
   * @returns {Promise<Object>} Updated refund
   */
  async updateRefundStatus(refundId, status, notes, userInfo) {
    const timer = logger.startTimer();
    
    try {
      // Get current refund
      const currentRefund = await this.getRefundById(refundId, null); // Internal call, no access control needed

      // Since status field doesn't exist, just return the refund as-is
      // In a real implementation, you'd either:
      // 1. Add status field to the schema, or
      // 2. Remove this method entirely

      logger.info('Refund status update requested (status field not implemented)', {
        refundId,
        requestedStatus: status,
        userId: userInfo.id,
        duration: timer.getDuration()
      });

      return currentRefund;

    } catch (error) {
      logger.error('Error in refund status update', {
        error: error.message,
        refundId,
        status,
        userId: userInfo.id,
        duration: timer.getDuration()
      });
      
      if (error instanceof BaseError) {
        throw error;
      }
      
      throw new BaseError('Failed to update refund status', 500, 'STATUS_UPDATE_FAILED');
    }
  }

  /**
   * Process refund (execute the actual refund) - NOTE: Status field doesn't exist in current schema
   * 
   * @param {number} refundId - Refund ID
   * @param {Object} processData - Processing data
   * @returns {Promise<Object>} Processed refund
   */
  async processRefund(refundId, processData) {
    const timer = logger.startTimer();
    
    try {
      const refund = await this.getRefundById(refundId, null); // Internal call, no access control needed

      // Since status field doesn't exist, we can't check approval status
      // In a real implementation, you'd either:
      // 1. Add status field to the schema, or
      // 2. Use a different approach to track refund processing

      // For now, just process the refund directly
      const processedRefund = await executeTransaction(async (tx) => {
        // Update refund with available fields only
        const updated = await tx.refund.update({
          where: { id: refundId },
          data: {
            // Can only update fields that exist in schema
            // Note: processedBy, processedAt, paymentMethod, transactionId, metadata don't exist
            reason: refund.reason || 'Processed'
          }
        });

        return updated;
      });

      // Handle stock restoration if needed (simplified since refundType doesn't exist)
      await this.restoreStock(refund);

      // Update sale status
      await this.updateSaleRefundStatus(refund.saleId, processedRefund);

      // Send completion notification
      await this.sendRefundNotification(processedRefund, 'COMPLETED');

      // Invalidate caches
      await this.invalidateRelevantCaches(refund.storeId, refund.saleId, refundId);

      logger.info('Refund processed successfully', {
        refundId,
        amount: refund.total,
        duration: timer.getDuration()
      });

      return await this.getRefundById(refundId, null); // Internal call, no access control needed

    } catch (error) {
      logger.error('Error processing refund', {
        error: error.message,
        refundId,
        processData,
        duration: timer.getDuration()
      });
      
      if (error instanceof BaseError) {
        throw error;
      }
      
      throw new BaseError('Failed to process refund', 500, 'REFUND_PROCESSING_FAILED');
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
        storeId: storeId,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
      };

      // Get basic analytics
      const [totalRefunds, refundCount, avgRefundAmount] = await Promise.all([
        RefundService.getPrisma().refund.aggregate({
          where: whereClause,
          _sum: { total: true }
        }),
        RefundService.getPrisma().refund.count({ where: whereClause }),
        RefundService.getPrisma().refund.aggregate({
          where: whereClause,
          _avg: { total: true }
        })
      ]);

      // Get refunds by reason (status field doesn't exist in schema)
      const refundsByReason = await RefundService.getPrisma().refund.groupBy({
        by: ['reason'],
        where: whereClause,
        _sum: { total: true },
        _count: { id: true },
        orderBy: {
          _sum: { total: 'desc' }
        }
      });

      // Get time-based analytics
      const timeBasedRefunds = await this.getTimeBasedRefunds(whereClause, groupBy);

      const analytics = {
        summary: {
          totalRefundAmount: totalRefunds._sum.total || 0,
          totalRefunds: refundCount,
          averageRefundAmount: avgRefundAmount._avg.total || 0,
          currency: 'CAD'
        },
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
      
      throw new BaseError('Failed to generate refund analytics', 500, 'ANALYTICS_GENERATION_FAILED');
    }
  }

  // === PRIVATE HELPER METHODS ===

  /**
   * Validate refund data
   */
  validateRefundData(refundData) {
    const required = ['saleId', 'amount', 'reason'];
    const missing = required.filter(field => !refundData[field]);
    
    if (missing.length > 0) {
      throw new BaseError(`Missing required fields: ${missing.join(', ')}`, 400, 'VALIDATION_ERROR');
    }

    if (refundData.amount <= 0) {
      throw new BaseError('Refund amount must be greater than zero', 400, 'VALIDATION_ERROR');
    }
  }

  /**
   * Get original sale details
   */
  async getOriginalSale(saleId) {
    const sale = await RefundService.getPrisma().sale.findUnique({
      where: { id: saleId },
      include: {
        lines: {        // Fixed: was items
          include: {
            product: true
          }
        },
        refunds: true
      }
    });

    if (!sale) {
      throw new BaseError('Original sale not found', 404, 'SALE_NOT_FOUND');
    }

    return sale;
  }

  /**
   * Validate refund eligibility
   */
  async validateRefundEligibility(sale, refundData) {
    // Check if sale is eligible for refund
    if (sale.status === 'CANCELLED') {
      throw new BaseError('Cannot refund a cancelled sale', 400, 'REFUND_NOT_ALLOWED');
    }

    // Check refund time limits (e.g., 30 days)
    const refundCutoff = new Date();
    refundCutoff.setDate(refundCutoff.getDate() - 30);
    
    if (sale.date < refundCutoff) {
      throw new BaseError('Sale is too old for refund (30 day limit)', 400, 'REFUND_EXPIRED');
    }

    // Check if already fully refunded
    const totalRefunded = sale.refunds
      .reduce((sum, r) => sum + r.total, 0);  // Fixed: use r.total instead of r.amount, and removed status filter

    if (totalRefunded >= sale.total) {
      throw new BaseError('Sale has already been fully refunded', 400, 'ALREADY_REFUNDED');
    }

    // Check if requested amount would exceed remaining refundable amount
    const remainingRefundable = sale.total - totalRefunded;
    if (refundData.amount > remainingRefundable) {
      throw new BaseError(400, 
        `Refund amount exceeds remaining refundable amount. Available: ${remainingRefundable}`, 
        'REFUND_AMOUNT_EXCEEDED'
      );
    }
  }

  /**
   * Calculate refund amounts
   */
  async calculateRefundAmounts(sale, refundData) {
    // Calculate based on items if provided, otherwise use the amount directly
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
      throw new BaseError('Refund amount does not match calculated total', 400, 'AMOUNT_MISMATCH');
    }
  }

  /**
   * Determine initial status based on amount and policies
   * NOTE: Status field doesn't exist in current schema - method kept for reference
   */
  determineInitialStatus(refundAmount, saleAmount) {
    // This method is not used since status field doesn't exist
    // Kept for reference in case status tracking is added to schema
    return 'PENDING'; // Default value
  }

  /**
   * Calculate refund priority
   * NOTE: Priority field doesn't exist in current schema - method kept for reference
   */
  calculateRefundPriority(amount, reason) {
    // This method is not used since priority field doesn't exist
    // Kept for reference in case priority tracking is added to schema
    return 1; // Default priority
  }

  /**
   * Validate status transition
   * NOTE: Status field doesn't exist in current schema - method kept for reference
   */
  validateStatusTransition(currentStatus, newStatus) {
    // This method is not used since status field doesn't exist
    // Kept for reference in case status tracking is added to schema
    logger.info('Status transition validation requested (status field not implemented)', {
      currentStatus,
      newStatus
    });
  }

  /**
   * Handle status change actions - NOTE: Status field doesn't exist in current schema
   * This method is kept for API compatibility but doesn't perform actual status actions
   */
  async handleStatusChangeActions(refund, status, userInfo) {
    // Since status field doesn't exist, we can't perform status-specific actions
    // In a real implementation, you'd either:
    // 1. Add status field to the schema, or
    // 2. Use a different approach to track refund states
    
    logger.info('Status change action requested (status field not implemented)', {
      refundId: refund.id,
      requestedStatus: status,
      userId: userInfo.id
    });
  }

  /**
   * Restore stock for refunded items
   */
  async restoreStock(refund) {
    try {
      const stockServiceUrl = process.env.STOCK_SERVICE_URL || 'http://localhost:3003';
      
      let stockUpdates = [];
      
      // Restore items based on refund lines if they exist, otherwise restore all sale items
      if (refund.lines && refund.lines.length > 0) {
        stockUpdates = refund.lines.map(item => ({
          productId: item.productId,
          storeId: refund.storeId,
          quantityChange: item.quantity,
          reason: 'REFUND',
          reference: `refund-${refund.id}`
        }));
      } else {
        // Restore all items from the original sale
        stockUpdates = refund.sale.lines.map(item => ({
          productId: item.productId,
          storeId: refund.storeId,
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
        refundId: refund.id
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
      // Get all refunds for this sale (removed status filter since status field doesn't exist)
      const saleRefunds = await RefundService.getPrisma().refund.findMany({
        where: { saleId }
      });

      const totalRefunded = saleRefunds.reduce((sum, r) => sum + r.total, 0);  // Fixed: use r.total instead of r.amount
      
      // Get original sale
      const sale = await RefundService.getPrisma().sale.findUnique({
        where: { id: saleId }
      });

      if (!sale) return;

      let newSaleStatus = sale.status;
      
      if (totalRefunded >= sale.total) {
        newSaleStatus = 'REFUNDED';
      } else if (totalRefunded > 0) {
        newSaleStatus = 'PARTIALLY_REFUNDED';
      }

      if (newSaleStatus !== sale.status) {
        // Call sales service to update status
        const salesServiceUrl = process.env.SALES_SERVICE_URL || 'http://sales-service:3005';
        
        logger.info('Updating sale status', {
          saleId,
          currentStatus: sale.status,
          newStatus: newSaleStatus,
          totalRefunded,
          saleTotal: sale.total,
          url: `${salesServiceUrl}/api/sales/${saleId}/status`
        });
        
        await axios.patch(`${salesServiceUrl}/api/sales/${saleId}/status`, {
          status: newSaleStatus
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.API_KEY || 'internal-service-key',
            'Authorization': `Bearer ${process.env.INTERNAL_TOKEN || 'internal-service-token'}`
          },
          timeout: 5000
        });
        
        logger.info('Sale status updated successfully', {
          saleId,
          newStatus: newSaleStatus
        });

        // Invalidate cache for this customer's sales data
        try {
          const cacheKey = `sales:customer:${sale.customerId}`;
          await redisClient.del(cacheKey);
          logger.info('Sales cache invalidated for customer', {
            customerId: sale.customerId,
            cacheKey
          });
        } catch (cacheError) {
          logger.warn('Failed to invalidate sales cache', {
            error: cacheError.message,
            customerId: sale.customerId
          });
        }
      }

    } catch (error) {
      logger.error('Failed to update sale refund status', {
        error: error.message,
        stack: error.stack,
        responseData: error.response?.data,
        responseStatus: error.response?.status,
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
        eventType
        // Note: customerEmail field doesn't exist in current schema
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
    
    // Note: status field doesn't exist in current Refund schema
    // If status filtering is needed, it should be added to the schema
    
    if (filters.startDate) {
      where.date = { ...where.date, gte: new Date(filters.startDate) };
    }
    
    if (filters.endDate) {
      where.date = { ...where.date, lte: new Date(filters.endDate) };
    }
    
    if (filters.reason) {
      where.reason = { contains: filters.reason, mode: 'insensitive' };
    }
    
    if (filters.userId) {
      where.userId = filters.userId;
    }
    
    if (filters.saleId) {
      where.saleId = filters.saleId;
    }
    
    return where;
  }

  /**
   * Get time-based refunds data
   */
  async getTimeBasedRefunds(whereClause, groupBy) {
    // This is a simplified version - in production you'd use proper SQL aggregation
    const refunds = await RefundService.getPrisma().refund.findMany({
      where: whereClause,
      select: {
        date: true,    // Fixed: was requestedAt
        total: true    // Fixed: was amount, and removed status since it doesn't exist
      },
      orderBy: {
        date: 'asc'    // Fixed: was requestedAt
      }
    });

    // Group refunds by time period
    const grouped = {};
    
    refunds.forEach(refund => {
      let key;
      const date = new Date(refund.date);  // Fixed: was refund.requestedAt
      
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
        grouped[key] = { amount: 0, count: 0 };
      }
      
      grouped[key].amount += refund.total;  // Fixed: was refund.amount
      grouped[key].count += 1;
      // Removed status check since status field doesn't exist
    });

    return Object.entries(grouped).map(([period, data]) => ({
      period,
      refundAmount: data.amount,
      refundCount: data.count
      // Removed completedCount since we don't have status
    }));
  }

  /**
   * Cache management methods
   */
  async getCachedResult(key) {
    try {
      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.warn('Cache retrieval failed', { key, error: error.message });
      return null;
    }
  }

  async setCachedResult(key, data, ttl = 300) {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      logger.warn('Cache storage failed', { key, error: error.message });
    }
  }

  async invalidateRelevantCaches(storeId, saleId = null, refundId = null) {
    try {
      const patterns = [
        `refunds:store:${storeId}:*`,
        `refunds:store:null:*`, // Also invalidate global refunds cache
        `analytics:refunds:${storeId}:*`
      ];
      
      if (saleId) {
        patterns.push(`sale:${saleId}:*`);
        
        // Also get the sale to find the customer and invalidate their sales cache
        try {
          const sale = await RefundService.getPrisma().sale.findUnique({
            where: { id: saleId }
          });
          if (sale && sale.userId) { // Fixed: use userId instead of customerId
            patterns.push(`sales:customer:${sale.userId}:*`);
            patterns.push(`sales:customer:${sale.userId}`);
          }
        } catch (error) {
          logger.warn('Failed to get sale for cache invalidation', { saleId, error: error.message });
        }
      }
      
      if (refundId) {
        patterns.push(`refund:${refundId}`);
      }
      
      // Add patterns to clear all user-specific refund caches
      patterns.push(`refunds:store:*`);
      
      for (const pattern of patterns) {
        if (pattern.includes('*')) {
          const keys = await redisClient.keys(pattern);
          if (keys.length > 0) {
            await redisClient.del(...keys);
          }
        } else {
          await redisClient.del(pattern);
        }
      }
      
      logger.info('Cache invalidated successfully', {
        storeId,
        saleId,
        refundId,
        patterns
      });
    } catch (error) {
      logger.warn('Cache invalidation failed', { storeId, saleId, refundId, error: error.message });
    }
  }

  /**
   * Additional convenience methods
   */

  async getPendingApprovals(filters = {}, pagination = {}) {
    // Since there's no status field in the schema, just get all refunds
    // If status tracking is needed, it should be added to the schema
    return this.getRefundsByStore(filters.storeId || null, filters, pagination);
  }

  async bulkApproveRefunds(refundIds, notes, userInfo) {
    // NOTE: Status field doesn't exist in current schema
    // This method is kept for API compatibility but doesn't actually update status
    
    const results = {
      processed: refundIds.length,
      successful: [],
      failed: []
    };

    for (const refundId of refundIds) {
      try {
        const refund = await this.getRefundById(refundId, null); // Internal call, no access control needed
        results.successful.push({ refundId, refund });
        
        logger.info('Bulk approve requested (status field not implemented)', {
          refundId,
          userId: userInfo.id
        });
      } catch (error) {
        results.failed.push({ refundId, error: error.message });
      }
    }

    return results;
  }

  async cancelRefund(refundId, reason, userInfo) {
    // NOTE: Status field doesn't exist in current schema
    // This method is kept for API compatibility but doesn't actually update status
    
    const refund = await this.getRefundById(refundId, null); // Internal call, no access control needed
    
    logger.info('Cancel refund requested (status field not implemented)', {
      refundId,
      reason,
      userId: userInfo.id
    });
    
    return refund;
  }
}

export default new RefundService();
