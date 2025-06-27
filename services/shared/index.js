/**
 * Shared Package Main Entry Point
 * 
 * Provides centralized exports for all shared middleware, utilities, and configurations.
 * This allows all microservices to import from a single source.
 * 
 * @author Log430 Lab5 Team
 * @version 1.0.0
 */

// Middleware exports
export {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  BaseError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  CacheError
} from './middleware/errorHandler.js';

export { logger } from './utils/logger.js';
export { healthCheck } from './utils/healthCheck.js';

export {
  httpMetricsMiddleware,
  recordOperation,
  recordDatabaseOperation,
  recordCacheOperation,
  recordError,
  updateMemoryUsage,
  metricsHandler,
  initializeMetrics,
  metrics,
  register
} from './middleware/metrics.js';

export {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  extractToken,
  authenticate,
  optionalAuthenticate,
  authorize,
  authorizeStore,
  requireAdmin,
  requireManager,
  requireEmployee,
  authenticateApiKey,
  rateLimitByUser,
  logAuthEvents
} from './middleware/auth.js';

export {
  initializeCache,
  generateCacheKey,
  isCacheAvailable,
  getFromCache,
  setInCache,
  deleteFromCache,
  deleteMultipleFromCache,
  clearServiceCache,
  existsInCache,
  setCacheExpiration,
  getCacheTTL,
  cacheMiddleware,
  invalidatePattern,
  warmUpCache,
  getCacheStats,
  closeCache,
  redisClient
} from './middleware/cache.js';

export {
  handleValidationErrors,
  validateId,
  validateNumericId,
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validateDate,
  validateDateRange,
  validatePositiveNumber,
  validatePositiveInteger,
  validatePrice,
  validateString,
  validateOptionalString,
  validateEnum,
  validateArray,
  validateArrayOfIds,
  validateUrl,
  validateFile,
  validatePagination,
  validateSearch,
  validateJson,
  validateUniqueEmail,
  validateExists,
  validatePasswordConfirmation,
  validateRole,
  validateStoreAccess,
  sanitizeString,
  sanitizeHtml,
  validateUser,
  validateUserUpdate,
  validateProduct,
  validateStore,
  validateSale,
  validate
} from './middleware/validateRequest.js';

// Database exports
export {
  initializeDatabase,
  getDatabaseClient,
  checkDatabaseHealth,
  disconnectDatabase,
  executeTransaction,
  getDatabaseMetrics,
  DatabaseInitializationError,
  DatabaseUtils
} from './database/index.js';

// Configuration exports
export {
  config,
  ConfigService
} from './config/index.js';

// Package information
export const SHARED_PACKAGE_VERSION = '1.0.0';
export const SHARED_PACKAGE_NAME = 'log430-shared';

/**
 * Initialize shared services
 * 
 * This function should be called by each microservice to initialize
 * all shared services and configurations.
 * 
 * @param {Object} options - Initialization options
 * @param {string} options.serviceName - Name of the service
 * @param {boolean} options.enableDatabase - Whether to initialize database (default: true)
 * @param {boolean} options.enableDatabaseLogging - Enable database query logging (default: development mode)
 */
export const initializeSharedServices = async (options = {}) => {
  const { logger } = await import('./utils/logger.js');
  const { config } = await import('./config/index.js');
  const { initializeCache } = await import('./middleware/cache.js');
  const { redisService } = await import('./utils/redis.js');
  const { initializeMetrics } = await import('./middleware/metrics.js');
  const { initializeDatabase } = await import('./database/index.js');

  const {
    serviceName = 'unknown-service',
    enableDatabase = true,
    enableDatabaseLogging = process.env.NODE_ENV === 'development'
  } = options;

  try {
    // Initialize configuration
    config.initialize();
    logger.info('Configuration initialized', { serviceName });

    // Initialize Redis service
    await redisService.initialize();
    logger.info('Redis service initialized', { serviceName });

    // Initialize cache
    await initializeCache();
    logger.info('Cache initialized', { serviceName });

    // Initialize database if enabled
    if (enableDatabase) {
      await initializeDatabase({
        serviceName,
        enableLogging: enableDatabaseLogging
      });
      logger.info('Database initialized', { serviceName });
    }

    // Initialize metrics
    initializeMetrics();
    logger.info('Metrics initialized', { serviceName });

    logger.info('All shared services initialized successfully', { serviceName });
    return true;
  } catch (error) {
    logger.error('Failed to initialize shared services', { 
      serviceName,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Cleanup shared services
 * 
 * This function should be called when the microservice is shutting down
 * to properly close all connections and cleanup resources.
 * 
 * @param {Object} options - Cleanup options
 * @param {string} options.serviceName - Name of the service
 */
export const cleanupSharedServices = async (options = {}) => {
  const { logger } = await import('./utils/logger.js');
  const { closeCache } = await import('./middleware/cache.js');
  const { redisService } = await import('./utils/redis.js');
  const { disconnectDatabase } = await import('./database/index.js');

  const { serviceName = 'unknown-service' } = options;

  try {
    // Disconnect from database
    await disconnectDatabase(serviceName);
    logger.info('Database connection closed', { serviceName });

    // Close cache connections
    await closeCache();
    logger.info('Cache connections closed', { serviceName });

    // Close Redis service connections
    await redisService.close();
    logger.info('Redis service connections closed', { serviceName });

    logger.info('All shared services cleaned up successfully', { serviceName });
    return true;
  } catch (error) {
    logger.error('Failed to cleanup shared services', { 
      serviceName,
      error: error.message 
    });
    return false;
  }
};

/**
 * Get shared package information
 */
export const getPackageInfo = () => {
  return {
    name: SHARED_PACKAGE_NAME,
    version: SHARED_PACKAGE_VERSION,
    description: 'Shared middleware, utilities, and configurations for Log430 microservices',
    author: 'Log430 Lab5 Team'
  };
};

// Default export for convenience
export default {
  // Core functions
  initializeSharedServices,
  cleanupSharedServices,
  getPackageInfo,
  
  // Package info
  SHARED_PACKAGE_VERSION,
  SHARED_PACKAGE_NAME
};
