/**
 * ApiError Class
 * 
 * Used throughout the application to throw standardized errors
 * that will be properly formatted in the response.
 */
export class ApiError extends Error {
  constructor(status, message, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.name = this.constructor.name;
  }
}

/**
 * Global Error Handler Middleware
 * 
 * Express middleware that catches all errors thrown in the request-response cycle
 * and formats them into a consistent JSON response structure.
 * 
 * @param {Error} err - The error object caught by Express
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  console.error(err); // Log the full error for debugging
  res.status(status).json({
    timestamp: new Date().toISOString(),
    status,
    error: err.name,
    message,
    path: req.path,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    meta: err.meta || undefined
  });
}; 