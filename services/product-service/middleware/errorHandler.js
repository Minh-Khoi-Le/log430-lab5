/**
 * Error Handler Middleware for Product Service
 * 
 * Centralized error handling middleware that:
 * - Formats error responses consistently
 * - Logs errors for debugging and monitoring
 * - Handles different types of errors (validation, database, authentication, etc.)
 * - Provides appropriate HTTP status codes
 * - Prevents sensitive information from being exposed to clients
 * 
 * This middleware should be registered last in the Express middleware chain
 * to catch any unhandled errors from other middleware or route handlers.
 */

/**
 * Global error handler middleware
 * @param {Error} error - The error object thrown by previous middleware
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object  
 * @param {NextFunction} next - Express next function
 */
export const errorHandler = (error, req, res, next) => {
  // Log error details for debugging and monitoring
  console.error('Product Service Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Default error response structure
  let statusCode = 500;
  let errorResponse = {
    service: 'product-service',
    error: 'Internal Server Error',
    message: 'An unexpected error occurred in the product service',
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Handle specific error types with appropriate status codes and messages
  
  // Validation errors (from express-validator)
  if (error.name === 'ValidationError' || error.type === 'validation') {
    statusCode = 400;
    errorResponse.error = 'Validation Error';
    errorResponse.message = 'Invalid product data provided';
    errorResponse.details = error.details || error.message;
  }
  
  // Database/Prisma errors
  else if (error.code?.startsWith('P')) {
    statusCode = 400;
    errorResponse.error = 'Database Error';
    
    // Handle common Prisma error codes
    switch (error.code) {
      case 'P2002':
        errorResponse.message = 'Product with this information already exists';
        break;
      case 'P2025':
        statusCode = 404;
        errorResponse.message = 'Product not found';
        break;
      case 'P2003':
        errorResponse.message = 'Invalid product reference';
        break;
      default:
        errorResponse.message = 'Database operation failed';
    }
  }
  
  // Authentication/Authorization errors
  else if (error.name === 'UnauthorizedError' || error.status === 401) {
    statusCode = 401;
    errorResponse.error = 'Authentication Error';
    errorResponse.message = 'Authentication required to access product management features';
  }
  
  else if (error.name === 'ForbiddenError' || error.status === 403) {
    statusCode = 403;
    errorResponse.error = 'Authorization Error';
    errorResponse.message = 'Insufficient permissions for product management';
  }
  
  // Not Found errors
  else if (error.status === 404 || error.name === 'NotFoundError') {
    statusCode = 404;
    errorResponse.error = 'Product Not Found';
    errorResponse.message = 'The requested product does not exist';
  }
  
  // Bad Request errors
  else if (error.status === 400 || error.name === 'BadRequestError') {
    statusCode = 400;
    errorResponse.error = 'Bad Request';
    errorResponse.message = error.message || 'Invalid product request';
  }
  
  // Custom business logic errors
  else if (error.type === 'PRODUCT_ERROR') {
    statusCode = error.statusCode || 400;
    errorResponse.error = 'Product Service Error';
    errorResponse.message = error.message;
  }

  // In development mode, include stack trace for debugging
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  // Send error response to client
  res.status(statusCode).json(errorResponse);
};
