/**
 * Shared Configuration Utility
 * 
 * Provides centralized configuration management for all microservices.
 * Handles environment variables, defaults, and validation.
 * 
 * @author Log430 Lab5 Team
 * @version 1.0.0
 */

import { logger } from '../utils/logger.js';

/**
 * Configuration Service Class
 */
class ConfigService {
  constructor() {
    this.config = {};
    this.requiredEnvVars = new Set();
    this.loadDefaultConfig();
  }

  /**
   * Load default configuration
   */
  loadDefaultConfig() {
    this.config = {
      // Service Information
      service: {
        name: process.env.SERVICE_NAME || 'unknown-service',
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '3000', 10)
      },

      // Database Configuration
      database: {
        url: process.env.DATABASE_URL || 'postgresql://localhost:5432/log430',
        ssl: process.env.DATABASE_SSL === 'true',
        poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
        connectionTimeout: parseInt(process.env.DATABASE_TIMEOUT || '30000', 10),
        logQueries: process.env.DATABASE_LOG_QUERIES === 'true'
      },

      // Redis Configuration
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        database: parseInt(process.env.REDIS_DB || '0', 10),
        ttl: parseInt(process.env.CACHE_DEFAULT_TTL || '3600', 10),
        keyPrefix: process.env.CACHE_PREFIX || 'log430'
      },

      // JWT Configuration
      jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer: process.env.JWT_ISSUER || 'log430-microservices',
        audience: process.env.JWT_AUDIENCE || 'log430-system'
      },

      // Security Configuration
      security: {
        bcryptRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
        corsOrigin: process.env.CORS_ORIGIN || '*',
        apiKeys: process.env.API_KEYS ? process.env.API_KEYS.split(',') : []
      },

      // Logging Configuration
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        toFile: process.env.LOG_TO_FILE === 'true',
        directory: process.env.LOG_DIR || './logs',
        maxSize: process.env.LOG_MAX_SIZE || '5MB',
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10)
      },

      // Metrics Configuration
      metrics: {
        enabled: process.env.METRICS_ENABLED !== 'false',
        port: parseInt(process.env.METRICS_PORT || '9090', 10),
        endpoint: process.env.METRICS_ENDPOINT || '/metrics',
        collectDefault: process.env.COLLECT_DEFAULT_METRICS !== 'false'
      },

      // Health Check Configuration
      health: {
        endpoint: process.env.HEALTH_ENDPOINT || '/health',
        timeout: parseInt(process.env.HEALTH_TIMEOUT || '5000', 10)
      },

      // External Services
      services: {
        userService: process.env.USER_SERVICE_URL || 'http://localhost:3001',
        productService: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
        storeService: process.env.STORE_SERVICE_URL || 'http://localhost:3003',
        stockService: process.env.STOCK_SERVICE_URL || 'http://localhost:3004',
        salesService: process.env.SALES_SERVICE_URL || 'http://localhost:3005',
        refundService: process.env.REFUND_SERVICE_URL || 'http://localhost:3006',
        cartService: process.env.CART_SERVICE_URL || 'http://localhost:3007'
      },

      // File Upload Configuration
      upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
        maxFiles: parseInt(process.env.MAX_FILES || '10', 10),
        allowedTypes: process.env.ALLOWED_FILE_TYPES ? process.env.ALLOWED_FILE_TYPES.split(',') : [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf'
        ],
        uploadDir: process.env.UPLOAD_DIR || './uploads'
      },

      // Email Configuration (if needed)
      email: {
        provider: process.env.EMAIL_PROVIDER || 'smtp',
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM || 'noreply@log430.com'
      }
    };
  }

  /**
   * Get configuration value
   */
  get(path, defaultValue = undefined) {
    const keys = path.split('.');
    let value = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Set configuration value
   */
  set(path, value) {
    const keys = path.split('.');
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    logger.debug('Configuration value set', { path, value });
  }

  /**
   * Mark environment variable as required
   */
  requireEnv(varName) {
    this.requiredEnvVars.add(varName);
  }

  /**
   * Validate required environment variables
   */
  validateRequired() {
    const missing = [];

    for (const varName of this.requiredEnvVars) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }

    if (missing.length > 0) {
      const error = `Missing required environment variables: ${missing.join(', ')}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info('All required environment variables are present');
  }

  /**
   * Validate configuration values
   */
  validate() {
    const errors = [];

    // Validate port
    if (this.config.service.port < 1 || this.config.service.port > 65535) {
      errors.push('Invalid port number');
    }

    // Validate JWT secret in production
    if (this.config.service.environment === 'production' && 
        this.config.jwt.secret === 'your-secret-key-change-in-production') {
      errors.push('JWT secret must be changed in production');
    }

    // Validate bcrypt rounds
    if (this.config.security.bcryptRounds < 10 || this.config.security.bcryptRounds > 15) {
      errors.push('Bcrypt rounds should be between 10 and 15');
    }

    // Validate log level
    const validLogLevels = ['error', 'warn', 'info', 'debug'];
    if (!validLogLevels.includes(this.config.logging.level)) {
      errors.push('Invalid log level');
    }

    if (errors.length > 0) {
      const error = `Configuration validation failed: ${errors.join(', ')}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info('Configuration validation passed');
  }

  /**
   * Get database configuration for Prisma
   */
  getDatabaseConfig() {
    return {
      url: this.config.database.url,
      ssl: this.config.database.ssl,
      pool: {
        timeout: this.config.database.connectionTimeout,
        size: this.config.database.poolSize
      },
      log: this.config.database.logQueries ? ['query', 'info', 'warn', 'error'] : []
    };
  }

  /**
   * Get Redis configuration
   */
  getRedisConfig() {
    const config = {
      url: this.config.redis.url,
      database: this.config.redis.database
    };

    if (this.config.redis.password) {
      config.password = this.config.redis.password;
    }

    return config;
  }

  /**
   * Get CORS configuration
   */
  getCorsConfig() {
    return {
      origin: this.config.security.corsOrigin === '*' ? true : this.config.security.corsOrigin.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
    };
  }

  /**
   * Get security headers configuration
   */
  getSecurityHeaders() {
    return {
      contentSecurityPolicy: this.config.service.environment === 'production',
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: this.config.service.environment === 'production',
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'no-referrer' },
      xssFilter: true
    };
  }

  /**
   * Check if running in development mode
   */
  isDevelopment() {
    return this.config.service.environment === 'development';
  }

  /**
   * Check if running in production mode
   */
  isProduction() {
    return this.config.service.environment === 'production';
  }

  /**
   * Check if running in test mode
   */
  isTest() {
    return this.config.service.environment === 'test';
  }

  /**
   * Get service information
   */
  getServiceInfo() {
    return {
      name: this.config.service.name,
      version: this.config.service.version,
      environment: this.config.service.environment,
      port: this.config.service.port,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    };
  }

  /**
   * Load configuration from file
   */
  loadFromFile(filePath) {
    try {
      const fs = require('fs');
      const configFile = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Merge with existing config
      this.config = { ...this.config, ...configFile };
      logger.info('Configuration loaded from file', { filePath });
    } catch (error) {
      logger.error('Failed to load configuration from file', { 
        filePath, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Export configuration to file
   */
  exportToFile(filePath) {
    try {
      const fs = require('fs');
      fs.writeFileSync(filePath, JSON.stringify(this.config, null, 2));
      logger.info('Configuration exported to file', { filePath });
    } catch (error) {
      logger.error('Failed to export configuration to file', { 
        filePath, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get full configuration (for debugging)
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Initialize configuration with validation
   */
  initialize() {
    try {
      this.validateRequired();
      this.validate();
      logger.info('Configuration initialized successfully', {
        service: this.config.service.name,
        environment: this.config.service.environment,
        port: this.config.service.port
      });
    } catch (error) {
      logger.error('Configuration initialization failed', { error: error.message });
      throw error;
    }
  }
}

// Create singleton instance
const config = new ConfigService();

// Export singleton instance and class
export { config, ConfigService };
export default config;
