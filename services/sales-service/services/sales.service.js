/**
 * Sales Service
 * 
 * Core business logic for sales operations in the microservices architecture.
 * This service handles transaction processing, inventory updates, and sales analytics.
 * 
 * Features:
 * - Transaction validation and processing
 * - Integration with stock service for inventory management
 * - Sales analytics and reporting
 * - Cache management for performance
 * - Error handling and logging
 * 
 * @author Sales Service Team
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import { getRedisClient } from '../utils/redis.js';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * Sales Service Class
 * 
 * Encapsulates all business logic for sales operations
 */
class SalesService {
  
  /**
   * Create a new sale transaction
   * 
   * @param {Object} saleData - Sale transaction data
   * @param {number} saleData.storeId - ID of the store
   * @param {number} saleData.customerId - ID of the customer (optional)
   * @param {Array} saleData.items - Array of items being sold
   * @param {string} saleData.paymentMethod - Payment method used
   * @param {number} saleData.totalAmount - Total transaction amount
   * @param {number} saleData.taxAmount - Tax amount
   * @param {number} saleData.discountAmount - Discount amount
   * @param {string} saleData.notes - Additional notes
   * @param {Object} userInfo - Information about the user creating the sale
   * @returns {Promise<Object>} Created sale transaction
   */
  async createSale(saleData, userInfo) {
    const timer = logger.startTimer();
    
    try {
      logger.info('Creating new sale transaction', {
        storeId: saleData.storeId,
        itemCount: saleData.items?.length,
        totalAmount: saleData.totalAmount,
        userId: userInfo.id
      });

      // Validate required fields
      this.validateSaleData(saleData);

      // Validate items and check stock availability
      await this.validateSaleItems(saleData.items, saleData.storeId);

      // Calculate totals and validate amounts
      const calculatedTotals = await this.calculateSaleTotals(saleData.items, saleData.storeId);
      this.validateSaleAmounts(saleData, calculatedTotals);

      // Create the sale transaction
      const sale = await prisma.$transaction(async (tx) => {
        // Create the main sale record
        const newSale = await tx.sale.create({
          data: {
            storeId: saleData.storeId,
            customerId: saleData.customerId || null,
            employeeId: userInfo.id,
            totalAmount: saleData.totalAmount,
            taxAmount: saleData.taxAmount || 0,
            discountAmount: saleData.discountAmount || 0,
            paymentMethod: saleData.paymentMethod,
            status: 'COMPLETED',
            saleDate: new Date(),
            notes: saleData.notes || null,
            metadata: {
              createdBy: userInfo.id,
              channel: 'POS',
              version: '1.0'
            }
          }
        });

        // Create sale items
        const saleItems = await Promise.all(
          saleData.items.map(item => 
            tx.saleItem.create({
              data: {
                saleId: newSale.id,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity * item.unitPrice,
                discount: item.discount || 0
              }
            })
          )
        );

        // Update stock levels
        await this.updateStockLevels(saleData.items, saleData.storeId);

        return {
          ...newSale,
          items: saleItems
        };
      });

      // Invalidate relevant caches
      await this.invalidateRelevantCaches(saleData.storeId);

      // Log successful sale creation
      logger.info('Sale transaction created successfully', {
        saleId: sale.id,
        storeId: saleData.storeId,
        totalAmount: saleData.totalAmount,
        duration: timer.getDuration()
      });

      return sale;

    } catch (error) {
      logger.error('Error creating sale transaction', {
        error: error.message,
        storeId: saleData.storeId,
        userId: userInfo.id,
        duration: timer.getDuration()
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'Failed to create sale transaction', 'SALE_CREATION_FAILED');
    }
  }

  /**
   * Get sales by store with filtering and pagination
   * 
   * @param {number} storeId - Store ID
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Sales data with pagination info
   */
  async getSalesByStore(storeId, filters = {}, pagination = {}) {
    const timer = logger.startTimer();
    
    try {
      const cacheKey = `sales:store:${storeId}:${JSON.stringify(filters)}:${JSON.stringify(pagination)}`;
      
      // Try to get from cache first
      const cachedResult = await this.getCachedResult(cacheKey);
      if (cachedResult) {
        logger.info('Sales data retrieved from cache', { storeId, cacheKey });
        return cachedResult;
      }

      // Build query filters
      const where = {
        storeId: storeId,
        ...this.buildSalesFilters(filters)
      };

      // Get total count
      const totalCount = await prisma.sale.count({ where });

      // Get paginated results
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      const sales = await prisma.sale.findMany({
        where,
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
              email: true
            }
          },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          saleDate: 'desc'
        },
        skip: offset,
        take: limit
      });

      const result = {
        sales,
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

      logger.info('Sales data retrieved successfully', {
        storeId,
        count: sales.length,
        totalCount,
        duration: timer.getDuration()
      });

      return result;

    } catch (error) {
      logger.error('Error retrieving sales data', {
        error: error.message,
        storeId,
        filters,
        duration: timer.getDuration()
      });
      
      throw new ApiError(500, 'Failed to retrieve sales data', 'SALES_RETRIEVAL_FAILED');
    }
  }

  /**
   * Get sale by ID with full details
   * 
   * @param {number} saleId - Sale ID
   * @param {number} storeId - Store ID for authorization
   * @returns {Promise<Object>} Sale details
   */
  async getSaleById(saleId, storeId) {
    const timer = logger.startTimer();
    
    try {
      const cacheKey = `sale:${saleId}:${storeId}`;
      
      // Try cache first
      const cachedSale = await this.getCachedResult(cacheKey);
      if (cachedSale) {
        return cachedSale;
      }

      const sale = await prisma.sale.findFirst({
        where: {
          id: saleId,
          storeId: storeId
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  category: true
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
          },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          refunds: {
            select: {
              id: true,
              amount: true,
              reason: true,
              status: true,
              createdAt: true
            }
          }
        }
      });

      if (!sale) {
        throw new ApiError(404, 'Sale not found', 'SALE_NOT_FOUND');
      }

      // Cache for 10 minutes
      await this.setCachedResult(cacheKey, sale, 600);

      logger.info('Sale retrieved successfully', {
        saleId,
        storeId,
        duration: timer.getDuration()
      });

      return sale;

    } catch (error) {
      logger.error('Error retrieving sale', {
        error: error.message,
        saleId,
        storeId,
        duration: timer.getDuration()
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'Failed to retrieve sale', 'SALE_RETRIEVAL_FAILED');
    }
  }

  /**
   * Get sales analytics for a store
   * 
   * @param {number} storeId - Store ID
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Sales analytics data
   */
  async getSalesAnalytics(storeId, options = {}) {
    const timer = logger.startTimer();
    
    try {
      const { startDate, endDate, groupBy = 'day' } = options;
      const cacheKey = `analytics:sales:${storeId}:${startDate}:${endDate}:${groupBy}`;
      
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
        storeId,
        status: 'COMPLETED',
        ...(Object.keys(dateFilter).length > 0 && { saleDate: dateFilter })
      };

      // Get basic analytics
      const [totalSales, salesCount, avgSaleAmount] = await Promise.all([
        prisma.sale.aggregate({
          where: whereClause,
          _sum: { totalAmount: true }
        }),
        prisma.sale.count({ where: whereClause }),
        prisma.sale.aggregate({
          where: whereClause,
          _avg: { totalAmount: true }
        })
      ]);

      // Get top products
      const topProducts = await prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          sale: whereClause
        },
        _sum: {
          quantity: true,
          totalPrice: true
        },
        _count: {
          id: true
        },
        orderBy: {
          _sum: {
            totalPrice: 'desc'
          }
        },
        take: 10
      });

      // Get sales by payment method
      const salesByPaymentMethod = await prisma.sale.groupBy({
        by: ['paymentMethod'],
        where: whereClause,
        _sum: {
          totalAmount: true
        },
        _count: {
          id: true
        }
      });

      // Get time-based analytics
      const timeBasedSales = await this.getTimeBasedSales(whereClause, groupBy);

      const analytics = {
        summary: {
          totalRevenue: totalSales._sum.totalAmount || 0,
          totalSales: salesCount,
          averageSaleAmount: avgSaleAmount._avg.totalAmount || 0,
          currency: 'CAD'
        },
        topProducts,
        paymentMethods: salesByPaymentMethod,
        timeSeries: timeBasedSales,
        generatedAt: new Date().toISOString()
      };

      // Cache for 15 minutes
      await this.setCachedResult(cacheKey, analytics, 900);

      logger.info('Sales analytics generated successfully', {
        storeId,
        totalRevenue: analytics.summary.totalRevenue,
        totalSales: analytics.summary.totalSales,
        duration: timer.getDuration()
      });

      return analytics;

    } catch (error) {
      logger.error('Error generating sales analytics', {
        error: error.message,
        storeId,
        options,
        duration: timer.getDuration()
      });
      
      throw new ApiError(500, 'Failed to generate sales analytics', 'ANALYTICS_GENERATION_FAILED');
    }
  }

  /**
   * Update sale status
   * 
   * @param {number} saleId - Sale ID
   * @param {string} status - New status
   * @param {Object} userInfo - User information
   * @returns {Promise<Object>} Updated sale
   */
  async updateSaleStatus(saleId, status, userInfo) {
    const timer = logger.startTimer();
    
    try {
      const validStatuses = ['COMPLETED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'];
      
      if (!validStatuses.includes(status)) {
        throw new ApiError(400, 'Invalid sale status', 'INVALID_STATUS');
      }

      const sale = await prisma.sale.update({
        where: { id: saleId },
        data: {
          status,
          updatedAt: new Date(),
          metadata: {
            lastUpdatedBy: userInfo.id,
            statusHistory: {
              previous: 'COMPLETED', // This would be tracked in a real implementation
              new: status,
              updatedAt: new Date().toISOString(),
              updatedBy: userInfo.id
            }
          }
        },
        include: {
          items: true
        }
      });

      // Invalidate caches
      await this.invalidateRelevantCaches(sale.storeId, saleId);

      logger.info('Sale status updated successfully', {
        saleId,
        status,
        userId: userInfo.id,
        duration: timer.getDuration()
      });

      return sale;

    } catch (error) {
      logger.error('Error updating sale status', {
        error: error.message,
        saleId,
        status,
        userId: userInfo.id,
        duration: timer.getDuration()
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'Failed to update sale status', 'STATUS_UPDATE_FAILED');
    }
  }

  // === PRIVATE HELPER METHODS ===

  /**
   * Validate sale data
   */
  validateSaleData(saleData) {
    const required = ['storeId', 'items', 'totalAmount', 'paymentMethod'];
    const missing = required.filter(field => !saleData[field]);
    
    if (missing.length > 0) {
      throw new ApiError(400, `Missing required fields: ${missing.join(', ')}`, 'VALIDATION_ERROR');
    }

    if (!Array.isArray(saleData.items) || saleData.items.length === 0) {
      throw new ApiError(400, 'Sale must contain at least one item', 'VALIDATION_ERROR');
    }

    if (saleData.totalAmount <= 0) {
      throw new ApiError(400, 'Total amount must be greater than zero', 'VALIDATION_ERROR');
    }

    // Validate each item
    saleData.items.forEach((item, index) => {
      if (!item.productId || !item.quantity || !item.unitPrice) {
        throw new ApiError(400, `Item ${index + 1} is missing required fields`, 'VALIDATION_ERROR');
      }
      
      if (item.quantity <= 0 || item.unitPrice <= 0) {
        throw new ApiError(400, `Item ${index + 1} has invalid quantity or price`, 'VALIDATION_ERROR');
      }
    });
  }

  /**
   * Validate sale items and check stock
   */
  async validateSaleItems(items, storeId) {
    try {
      // Call stock service to validate availability
      const stockServiceUrl = process.env.STOCK_SERVICE_URL || 'http://localhost:3003';
      
      for (const item of items) {
        const response = await axios.get(
          `${stockServiceUrl}/api/stock/product/${item.productId}/store/${storeId}`
        );
        
        const stockData = response.data.data;
        
        if (stockData.quantity < item.quantity) {
          throw new ApiError(400, 
            `Insufficient stock for product ${item.productId}. Available: ${stockData.quantity}, Required: ${item.quantity}`, 
            'INSUFFICIENT_STOCK'
          );
        }
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      logger.warn('Could not validate stock - proceeding with sale', {
        error: error.message,
        storeId,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity }))
      });
    }
  }

  /**
   * Calculate sale totals
   */
  async calculateSaleTotals(items, storeId) {
    let subtotal = 0;
    
    for (const item of items) {
      subtotal += item.quantity * item.unitPrice;
    }
    
    return {
      subtotal,
      tax: subtotal * 0.15, // 15% tax rate
      total: subtotal * 1.15
    };
  }

  /**
   * Validate sale amounts
   */
  validateSaleAmounts(saleData, calculated) {
    const tolerance = 0.01; // 1 cent tolerance for rounding
    
    if (Math.abs(saleData.totalAmount - calculated.total) > tolerance) {
      throw new ApiError(400, 'Sale amount does not match calculated total', 'AMOUNT_MISMATCH');
    }
  }

  /**
   * Update stock levels
   */
  async updateStockLevels(items, storeId) {
    try {
      const stockServiceUrl = process.env.STOCK_SERVICE_URL || 'http://localhost:3003';
      
      // Prepare stock updates
      const stockUpdates = items.map(item => ({
        productId: item.productId,
        storeId: storeId,
        quantityChange: -item.quantity, // Negative for sale
        reason: 'SALE',
        reference: 'sale-transaction'
      }));

      // Call stock service to update inventory
      await axios.post(`${stockServiceUrl}/api/stock/bulk-update`, {
        updates: stockUpdates
      });

    } catch (error) {
      logger.error('Failed to update stock levels', {
        error: error.message,
        storeId,
        items
      });
      
      // In a real implementation, you might want to handle this differently
      // For now, we'll log the error but not fail the sale
    }
  }

  /**
   * Build sales filters
   */
  buildSalesFilters(filters) {
    const where = {};
    
    if (filters.startDate) {
      where.saleDate = { ...where.saleDate, gte: new Date(filters.startDate) };
    }
    
    if (filters.endDate) {
      where.saleDate = { ...where.saleDate, lte: new Date(filters.endDate) };
    }
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }
    
    if (filters.customerId) {
      where.customerId = filters.customerId;
    }
    
    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }
    
    return where;
  }

  /**
   * Get time-based sales data
   */
  async getTimeBasedSales(whereClause, groupBy) {
    // This is a simplified version - in production you'd use proper SQL aggregation
    const sales = await prisma.sale.findMany({
      where: whereClause,
      select: {
        saleDate: true,
        totalAmount: true
      },
      orderBy: {
        saleDate: 'asc'
      }
    });

    // Group sales by time period
    const grouped = {};
    
    sales.forEach(sale => {
      let key;
      const date = new Date(sale.saleDate);
      
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
        grouped[key] = { revenue: 0, count: 0 };
      }
      
      grouped[key].revenue += sale.totalAmount;
      grouped[key].count += 1;
    });

    return Object.entries(grouped).map(([period, data]) => ({
      period,
      revenue: data.revenue,
      salesCount: data.count
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

  async invalidateRelevantCaches(storeId, saleId = null) {
    try {
      const redis = getRedisClient();
      const patterns = [
        `sales:store:${storeId}:*`,
        `analytics:sales:${storeId}:*`
      ];
      
      if (saleId) {
        patterns.push(`sale:${saleId}:*`);
      }
      
      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }
    } catch (error) {
      logger.warn('Cache invalidation failed', { storeId, saleId, error: error.message });
    }
  }
}

export default new SalesService();
