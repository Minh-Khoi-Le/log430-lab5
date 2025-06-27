/**
 * Shared Database Module
 * 
 * Provides centralized database access and management for all microservices.
 * Uses a singleton pattern to ensure only one Prisma client instance per service.
 * 
 * Features:
 * - Centralized connection management
 * - Health checking
 * - Metrics collection
 * - Error handling
 * - Graceful shutdown
 * - Service-specific client instances
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { recordDatabaseOperation } from '../middleware/metrics.js';

// Global singleton instance
let globalPrismaClient = null;
let isInitialized = false;
let connectionMetrics = {
  queries: 0,
  errors: 0,
  totalDuration: 0,
  lastActivity: null
};

/**
 * Initialize the shared database client
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.serviceName - Name of the service using the database
 * @param {boolean} options.enableLogging - Enable query logging (default: development mode)
 * @returns {Promise<PrismaClient>} Prisma client instance
 */
export async function initializeDatabase(options = {}) {
  try {
    if (globalPrismaClient && isInitialized) {
      logger.info('Database already initialized, returning existing client');
      return globalPrismaClient;
    }

    const {
      serviceName = 'unknown-service',
      enableLogging = process.env.NODE_ENV === 'development'
    } = options;

    logger.info('Initializing shared database client', { serviceName });

    // Create Prisma client with appropriate configuration
    globalPrismaClient = new PrismaClient({
      log: enableLogging ? [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' }
      ] : [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' }
      ],
      errorFormat: 'pretty'
    });

    // Set up event listeners for monitoring
    setupEventListeners(globalPrismaClient, serviceName, enableLogging);

    // Test the connection
    await globalPrismaClient.$connect();
    logger.info('Database connection established successfully', { serviceName });

    // Run a simple health check
    await runHealthCheck(serviceName);

    isInitialized = true;
    return globalPrismaClient;

  } catch (error) {
    logger.error('Failed to initialize database', {
      serviceName: options.serviceName,
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    throw new DatabaseInitializationError(`Database initialization failed: ${error.message}`, error);
  }
}

/**
 * Get the current database client instance
 * 
 * @param {string} serviceName - Name of the requesting service (for logging)
 * @returns {PrismaClient} Prisma client instance
 * @throws {Error} If database is not initialized
 */
export function getDatabaseClient(serviceName = 'unknown-service') {
  if (!globalPrismaClient || !isInitialized) {
    throw new Error(`Database not initialized for service: ${serviceName}. Call initializeDatabase() first.`);
  }

  // Update last activity
  connectionMetrics.lastActivity = new Date();
  
  return globalPrismaClient;
}

/**
 * Setup event listeners for database monitoring
 * 
 * @param {PrismaClient} client - Prisma client instance
 * @param {string} serviceName - Service name for logging context
 * @param {boolean} enableQueryLogging - Whether to log queries
 */
function setupEventListeners(client, serviceName, enableQueryLogging) {
  // Query event - for performance monitoring
  client.$on('query', (e) => {
    connectionMetrics.queries++;
    connectionMetrics.totalDuration += e.duration;
    connectionMetrics.lastActivity = new Date();

    // Record metrics
    recordDatabaseOperation('query', 'prisma', e.duration, 'success');

    // Log query in development
    if (enableQueryLogging) {
      logger.debug('Database query executed', {
        serviceName,
        query: e.query.substring(0, 100) + (e.query.length > 100 ? '...' : ''),
        duration: `${e.duration}ms`,
        params: e.params ? JSON.stringify(e.params).substring(0, 200) : undefined
      });
    }
  });

  // Error event
  client.$on('error', (e) => {
    connectionMetrics.errors++;
    recordDatabaseOperation('query', 'prisma', 0, 'error');
    
    logger.error('Database error occurred', {
      serviceName,
      error: e.message,
      target: e.target
    });
  });

  // Info event
  client.$on('info', (e) => {
    logger.info('Database info', {
      serviceName,
      message: e.message,
      target: e.target
    });
  });

  // Warning event
  client.$on('warn', (e) => {
    logger.warn('Database warning', {
      serviceName,
      message: e.message,
      target: e.target
    });
  });
}

/**
 * Run a health check on the database
 * 
 * @param {string} serviceName - Service name for logging
 * @returns {Promise<boolean>} True if healthy
 */
async function runHealthCheck(serviceName) {
  try {
    const startTime = Date.now();
    
    // Simple connectivity test
    await globalPrismaClient.$queryRaw`SELECT 1 as health_check`;
    
    const duration = Date.now() - startTime;
    
    logger.info('Database health check passed', {
      serviceName,
      duration: `${duration}ms`
    });

    recordDatabaseOperation('health_check', 'system', duration, 'success');
    return true;

  } catch (error) {
    logger.error('Database health check failed', {
      serviceName,
      error: error.message
    });

    recordDatabaseOperation('health_check', 'system', 0, 'error');
    return false;
  }
}

/**
 * Check if database is healthy
 * 
 * @param {string} serviceName - Service name for logging
 * @returns {Promise<Object>} Health status object
 */
export async function checkDatabaseHealth(serviceName = 'unknown-service') {
  if (!globalPrismaClient || !isInitialized) {
    return {
      healthy: false,
      status: 'not_initialized',
      message: 'Database client not initialized'
    };
  }

  try {
    const startTime = Date.now();
    await globalPrismaClient.$queryRaw`SELECT 1 as health_check`;
    const duration = Date.now() - startTime;

    recordDatabaseOperation('health_check', 'system', duration, 'success');

    return {
      healthy: true,
      status: 'connected',
      message: 'Database is responding',
      responseTime: `${duration}ms`,
      metrics: {
        totalQueries: connectionMetrics.queries,
        totalErrors: connectionMetrics.errors,
        averageQueryTime: connectionMetrics.queries > 0 
          ? Math.round(connectionMetrics.totalDuration / connectionMetrics.queries) + 'ms'
          : '0ms',
        lastActivity: connectionMetrics.lastActivity
      }
    };

  } catch (error) {
    recordDatabaseOperation('health_check', 'system', 0, 'error');
    
    return {
      healthy: false,
      status: 'error',
      message: error.message,
      code: error.code,
      metrics: {
        totalQueries: connectionMetrics.queries,
        totalErrors: connectionMetrics.errors,
        lastActivity: connectionMetrics.lastActivity
      }
    };
  }
}

/**
 * Gracefully disconnect from the database
 * 
 * @param {string} serviceName - Service name for logging
 */
export async function disconnectDatabase(serviceName = 'unknown-service') {
  if (globalPrismaClient) {
    try {
      await globalPrismaClient.$disconnect();
      logger.info('Database connection closed gracefully', { 
        serviceName,
        metrics: connectionMetrics
      });
      
      // Reset state
      globalPrismaClient = null;
      isInitialized = false;
      
      // Reset metrics
      connectionMetrics = {
        queries: 0,
        errors: 0,
        totalDuration: 0,
        lastActivity: null
      };

    } catch (error) {
      logger.error('Error while disconnecting from database', {
        serviceName,
        error: error.message
      });
      throw error;
    }
  }
}

/**
 * Execute a database transaction
 * 
 * @param {Function} callback - Transaction callback function
 * @param {string} serviceName - Service name for logging
 * @returns {Promise<any>} Transaction result
 */
export async function executeTransaction(callback, serviceName = 'unknown-service') {
  const client = getDatabaseClient(serviceName);
  
  try {
    const startTime = Date.now();
    const result = await client.$transaction(callback);
    const duration = Date.now() - startTime;
    
    recordDatabaseOperation('transaction', 'prisma', duration, 'success');
    
    logger.debug('Database transaction completed', {
      serviceName,
      duration: `${duration}ms`
    });
    
    return result;
    
  } catch (error) {
    recordDatabaseOperation('transaction', 'prisma', 0, 'error');
    
    logger.error('Database transaction failed', {
      serviceName,
      error: error.message
    });
    
    throw error;
  }
}

/**
 * Get database connection metrics
 * 
 * @returns {Object} Connection metrics
 */
export function getDatabaseMetrics() {
  return {
    ...connectionMetrics,
    isInitialized,
    clientStatus: globalPrismaClient ? 'connected' : 'disconnected'
  };
}

/**
 * Custom error class for database initialization failures
 */
export class DatabaseInitializationError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'DatabaseInitializationError';
    this.cause = cause;
  }
}

/**
 * Utility functions for common database operations
 */
export const DatabaseUtils = {
  /**
   * Handle Prisma errors and convert to appropriate HTTP errors
   */
  handlePrismaError(error, serviceName = 'unknown-service') {
    logger.error('Prisma error occurred', {
      serviceName,
      code: error.code,
      message: error.message,
      meta: error.meta
    });

    // P2002: Unique constraint violation
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      throw new ConflictError(`A record with this ${field} already exists`);
    }

    // P2025: Record not found
    if (error.code === 'P2025') {
      throw new NotFoundError('Record not found');
    }

    // P2003: Foreign key constraint violation
    if (error.code === 'P2003') {
      throw new ConflictError('Cannot delete record due to existing references');
    }

    // P2014: Required relation violation
    if (error.code === 'P2014') {
      throw new ConflictError('Required relation is missing');
    }

    // Default to generic database error
    throw new DatabaseError(`Database operation failed: ${error.message}`);
  },

  /**
   * Build pagination metadata
   */
  buildPaginationMetadata(page, size, total) {
    const pages = Math.ceil(total / size);
    return {
      page: parseInt(page),
      size: parseInt(size),
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1
    };
  },

  /**
   * Build where clause for text search
   */
  buildTextSearchWhere(searchTerm, fields) {
    if (!searchTerm) return {};
    
    return {
      OR: fields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      }))
    };
  },

  /**
   * Build orderBy clause from sort string
   */
  buildOrderBy(sortString, allowedFields) {
    if (!sortString) return { id: 'asc' };
    
    const direction = sortString.startsWith('-') ? 'desc' : 'asc';
    const field = sortString.replace(/^[+-]/, '');
    
    if (allowedFields.includes(field)) {
      return { [field]: direction };
    }
    
    return { id: 'asc' };
  }
};

// Import error classes that might be used
import { ConflictError, NotFoundError, DatabaseError } from '../middleware/errorHandler.js';
