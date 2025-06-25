/**
 * Request Validation Middleware for Product Service
 * 
 * This middleware works with express-validator to validate incoming requests.
 * It checks for validation errors from route validators and returns
 * consistent error responses if validation fails.
 * 
 * Validation covers:
 * - Request parameters (product IDs, pagination parameters)
 * - Request body data (product creation/update data)
 * - Query parameters (search, filtering, sorting)
 * 
 * The middleware ensures that only valid data reaches the controllers
 * and provides clear feedback about validation errors.
 */

import { validationResult } from 'express-validator';
import { recordError } from './metrics.js';

/**
 * Validation middleware function
 * 
 * Checks for validation errors and returns formatted error response if any exist
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const validateRequest = (req, res, next) => {
  // Get validation results from express-validator
  const errors = validationResult(req);
  
  // If no validation errors, continue to next middleware
  if (errors.isEmpty()) {
    return next();
  }

  // Record validation error for metrics
  recordError('validation', req.path);

  // Format validation errors for consistent API response
  const formattedErrors = errors.array().map(error => ({
    field: error.path || error.param,
    value: error.value,
    message: error.msg,
    location: error.location
  }));

  // Group errors by field for better readability
  const errorsByField = formattedErrors.reduce((acc, error) => {
    const field = error.field;
    if (!acc[field]) {
      acc[field] = [];
    }
    acc[field].push(error.message);
    return acc;
  }, {});

  // Return validation error response
  return res.status(400).json({
    success: false,
    error: 'Validation Error',
    message: 'The request contains invalid data',
    service: 'product-service',
    details: {
      errorCount: formattedErrors.length,
      errors: formattedErrors,
      errorsByField
    },
    timestamp: new Date().toISOString()
  });
};
