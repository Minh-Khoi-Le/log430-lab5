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

// Utilities exports
export {
  logger,
  winstonLogger,
  formatTimestamp,
  shouldLog
} from './utils/logger.js';

export {
  redisService,
  RedisService
} from './utils/redis.js';

export {
  cacheInvalidation,
  CacheInvalidationService
} from './utils/cacheInvalidation.js';

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
 */
export const initializeSharedServices = async () => {
  const { logger } = await import('./utils/logger.js');
  const { config } = await import('./config/index.js');
  const { initializeCache } = await import('./middleware/cache.js');
  const { redisService } = await import('./utils/redis.js');
  const { initializeMetrics } = await import('./middleware/metrics.js');

  try {
    // Initialize configuration
    config.initialize();
    logger.info('Configuration initialized');

    // Initialize Redis service
    await redisService.initialize();
    logger.info('Redis service initialized');

    // Initialize cache
    await initializeCache();
    logger.info('Cache initialized');

    // Initialize metrics
    initializeMetrics();
    logger.info('Metrics initialized');

    logger.info('All shared services initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize shared services', { error: error.message });
    throw error;
  }
};

/**
 * Cleanup shared services
 * 
 * This function should be called when the microservice is shutting down
 * to properly close all connections and cleanup resources.
 */
export const cleanupSharedServices = async () => {
  const { logger } = await import('./utils/logger.js');
  const { closeCache } = await import('./middleware/cache.js');
  const { redisService } = await import('./utils/redis.js');

  try {
    // Close cache connections
    await closeCache();
    logger.info('Cache connections closed');

    // Close Redis service connections
    await redisService.close();
    logger.info('Redis service connections closed');

    logger.info('All shared services cleaned up successfully');
    return true;
  } catch (error) {
    logger.error('Failed to cleanup shared services', { error: error.message });
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
