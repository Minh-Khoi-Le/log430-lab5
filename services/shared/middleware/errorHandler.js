/**
 * Shared Error Handler Middleware
 * 
 * Centralized error handling for all microservices.
 * Provides consistent error responses and proper HTTP status codes.
 * 
 * @author Log430 Lab5 Team
 * @version 1.0.0
 */

import { logger } from '../utils/logger.js';

/**
 * Custom Error Classes
 */
export class BaseError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends BaseError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends BaseError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends BaseError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export class DatabaseError extends BaseError {
  constructor(message = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

export class CacheError extends BaseError {
  constructor(message = 'Cache operation failed') {
    super(message, 500, 'CACHE_ERROR');
  }
}

/**
 * Global Error Handler Middleware
 * 
 * Catches all errors thrown in the application and formats them
 * into consistent error responses with appropriate HTTP status codes.
 * 
 * @param {Error} error - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const errorHandler = (error, req, res, next) => {
  // Determine service name from environment or default
  const serviceName = process.env.SERVICE_NAME || 'unknown-service';
  
  // Log the error for debugging and monitoring
  logger.error(`${serviceName} Error:`, {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    headers: req.headers,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString(),
    service: serviceName
  });

  // Default error response
  let statusCode = 500;
  let errorResponse = {
    success: false,
    message: 'Internal server error',
    error: 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString(),
    service: serviceName,
    path: req.path
  };

  // Handle custom error classes
  if (error instanceof BaseError) {
    statusCode = error.statusCode;
    errorResponse.error = error.errorCode;
    errorResponse.message = error.message;
    
    if (error instanceof ValidationError && error.details) {
      errorResponse.details = error.details;
    }
  }
  // Handle Prisma errors
  else if (error.code && error.code.startsWith('P')) {
    statusCode = 400;
    errorResponse.error = 'DATABASE_ERROR';
    
    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        errorResponse.error = 'CONFLICT';
        errorResponse.message = 'Resource already exists';
        break;
      case 'P2025':
        statusCode = 404;
        errorResponse.error = 'NOT_FOUND';
        errorResponse.message = 'Resource not found';
        break;
      case 'P2003':
        statusCode = 400;
        errorResponse.error = 'FOREIGN_KEY_CONSTRAINT';
        errorResponse.message = 'Foreign key constraint failed';
        break;
      default:
        errorResponse.message = 'Database operation failed';
    }
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorResponse.error = 'INVALID_TOKEN';
    errorResponse.message = 'Invalid authentication token';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorResponse.error = 'TOKEN_EXPIRED';
    errorResponse.message = 'Authentication token has expired';
  }
  // Handle validation errors (from express-validator)
  else if (error.name === 'ValidationError' || error.type === 'validation') {
    statusCode = 400;
    errorResponse.error = 'VALIDATION_ERROR';
    errorResponse.message = 'Invalid input data';
    errorResponse.details = error.details || error.message;
  }
  // Handle multer errors (file upload)
  else if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    errorResponse.error = 'FILE_TOO_LARGE';
    errorResponse.message = 'File size exceeds the allowed limit';
  }
  else if (error.code === 'LIMIT_FILE_COUNT') {
    statusCode = 413;
    errorResponse.error = 'TOO_MANY_FILES';
    errorResponse.message = 'Too many files uploaded';
  }
  // Handle mongoose/MongoDB errors
  else if (error.name === 'CastError') {
    statusCode = 400;
    errorResponse.error = 'INVALID_ID';
    errorResponse.message = 'Invalid resource ID format';
  }
  else if (error.code === 11000) {
    statusCode = 409;
    errorResponse.error = 'DUPLICATE_KEY';
    errorResponse.message = 'Resource already exists';
  }
  // Handle Redis errors
  else if (error.message && error.message.includes('Redis')) {
    statusCode = 503;
    errorResponse.error = 'CACHE_UNAVAILABLE';
    errorResponse.message = 'Cache service temporarily unavailable';
  }
  // Handle rate limiting errors
  else if (error.message && error.message.includes('Too many requests')) {
    statusCode = 429;
    errorResponse.error = 'RATE_LIMIT_EXCEEDED';
    errorResponse.message = 'Too many requests, please try again later';
  }
  // Handle timeout errors
  else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
    statusCode = 408;
    errorResponse.error = 'REQUEST_TIMEOUT';
    errorResponse.message = 'Request timeout';
  }
  // Handle network errors
  else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    statusCode = 503;
    errorResponse.error = 'SERVICE_UNAVAILABLE';
    errorResponse.message = 'External service unavailable';
  }

  // Don't expose stack trace in production
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found Handler
 * 
 * Handles requests to non-existent routes
 */
export const notFoundHandler = (req, res) => {
  const serviceName = process.env.SERVICE_NAME || 'unknown-service';
  
  logger.warn(`${serviceName} - Route not found:`, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    service: serviceName
  });

  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
    service: serviceName,
    path: req.path
  });
};

/**
 * Async Error Handler Wrapper
 * 
 * Wraps async route handlers to catch any unhandled promise rejections
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
