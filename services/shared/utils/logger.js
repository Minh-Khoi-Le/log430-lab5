/**
 * Shared Logger Utility
 * 
 * Provides structured logging with different levels and formats.
 * Supports both console and file logging with configurable levels.
 * 
 * @author Log430 Lab5 Team
 * @version 1.0.0
 */

import winston from 'winston';
import path from 'path';

/**
 * Log Levels
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * Current log level from environment
 */
const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;
const SERVICE_NAME = process.env.SERVICE_NAME || 'unknown-service';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Log Colors for Console Output
 */
const COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[90m', // Gray
  RESET: '\x1b[0m'   // Reset
};

/**
 * Custom log format for console
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const color = COLORS[level.toUpperCase()] || COLORS.INFO;
    const serviceName = service || SERVICE_NAME;
    let logMessage = `${color}[${timestamp}] ${level.toUpperCase()} [${serviceName}]: ${message}${COLORS.RESET}`;
    
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

/**
 * Custom log format for files
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Create transports array
 */
const transports = [
  // Console transport
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: consoleFormat,
    handleExceptions: true,
    handleRejections: true
  })
];

// Add file transports in production or when LOG_TO_FILE is enabled
if (NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
  const logDir = process.env.LOG_DIR || './logs';
  
  // Error log file
  transports.push(new winston.transports.File({
    filename: path.join(logDir, `${SERVICE_NAME}-error.log`),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    handleExceptions: true
  }));
  
  // Combined log file
  transports.push(new winston.transports.File({
    filename: path.join(logDir, `${SERVICE_NAME}-combined.log`),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

/**
 * Create Winston logger instance
 */
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: winston.config.npm.levels,
  defaultMeta: { service: SERVICE_NAME },
  transports,
  exitOnError: false
});

/**
 * Enhanced Logger with additional functionality
 */
class Logger {
  constructor(winstonInstance) {
    this.winston = winstonInstance;
  }

  /**
   * Log error message
   */
  error(message, meta = {}) {
    this.winston.error(message, { ...meta, timestamp: new Date().toISOString() });
  }

  /**
   * Log warning message
   */
  warn(message, meta = {}) {
    this.winston.warn(message, { ...meta, timestamp: new Date().toISOString() });
  }

  /**
   * Log info message
   */
  info(message, meta = {}) {
    this.winston.info(message, { ...meta, timestamp: new Date().toISOString() });
  }

  /**
   * Log debug message
   */
  debug(message, meta = {}) {
    this.winston.debug(message, { ...meta, timestamp: new Date().toISOString() });
  }

  /**
   * Log HTTP request
   */
  logRequest(req, res, duration) {
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length'),
      timestamp: new Date().toISOString()
    };

    if (res.statusCode >= 400) {
      this.error(`HTTP ${req.method} ${req.url}`, logData);
    } else {
      this.info(`HTTP ${req.method} ${req.url}`, logData);
    }
  }

  /**
   * Log user activity
   */
  logUserActivity(userId, action, details = {}) {
    this.info(`User Activity: ${action}`, {
      userId,
      action,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log database operation
   */
  logDatabaseOperation(operation, table, duration, success = true) {
    const logData = {
      operation,
      table,
      duration: `${duration}ms`,
      success,
      timestamp: new Date().toISOString()
    };

    if (success) {
      this.debug(`Database ${operation} on ${table}`, logData);
    } else {
      this.error(`Database ${operation} failed on ${table}`, logData);
    }
  }

  /**
   * Log cache operation
   */
  logCacheOperation(operation, key, hit = false, duration = null) {
    const logData = {
      operation,
      key,
      hit,
      timestamp: new Date().toISOString()
    };

    if (duration) {
      logData.duration = `${duration}ms`;
    }

    this.debug(`Cache ${operation}: ${key}`, logData);
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation, duration, metadata = {}) {
    this.info(`Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log security event
   */
  logSecurity(event, details = {}) {
    this.warn(`Security Event: ${event}`, {
      event,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Create child logger with additional context
   */
  child(context) {
    return new Logger(this.winston.child(context));
  }

  /**
   * Stream for Morgan middleware
   */
  get stream() {
    return {
      write: (message) => {
        this.info(message.trim());
      }
    };
  }
}

// Create and export logger instance
export const logger = new Logger(winstonLogger);

// Export Winston instance for advanced usage
export { winstonLogger };

// Utility functions for backward compatibility
export const formatTimestamp = () => {
  return new Date().toISOString();
};

export const shouldLog = (level) => {
  const levelValue = LOG_LEVELS[level.toUpperCase()];
  return levelValue !== undefined && levelValue <= CURRENT_LOG_LEVEL;
};

// Default export
export default logger;
