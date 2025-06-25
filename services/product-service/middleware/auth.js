/**
 * Authentication Middleware for Product Service
 * 
 * This middleware handles JWT token validation for protected routes.
 * It verifies the token's signature, expiration, and extracts user information
 * for authorization decisions.
 * 
 * Protected routes that require authentication:
 * - POST /products (create product)
 * - PUT /products/:id (update product)
 * - DELETE /products/:id (delete product)
 * 
 * The middleware adds user information to the request object for use
 * by subsequent middleware and route handlers.
 */

import jwt from 'jsonwebtoken';
import { recordError } from './metrics.js';

// JWT secret key - should be shared across all services or retrieved from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Authentication middleware function
 * 
 * Verifies JWT tokens and extracts user information
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const auth = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      recordError('auth_missing_header', req.path);
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No authorization header provided',
        service: 'product-service'
      });
    }

    // Check if header starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      recordError('auth_invalid_format', req.path);
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        message: 'Authorization header must start with Bearer',
        service: 'product-service'
      });
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);
    
    if (!token) {
      recordError('auth_missing_token', req.path);
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No token provided',
        service: 'product-service'
      });
    }

    // Verify and decode the JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add user information to request object
    req.user = {
      id: decoded.id,
      name: decoded.name,
      role: decoded.role || 'client'
    };

    // Check if user has admin role for product management operations
    if (req.method !== 'GET' && req.user.role !== 'manager') {
      recordError('auth_insufficient_permissions', req.path);
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: 'Admin role required for product management operations',
        service: 'product-service'
      });
    }

    // Authentication successful, continue to next middleware
    next();

  } catch (error) {
    // Handle JWT verification errors
    if (error.name === 'JsonWebTokenError') {
      recordError('auth_invalid_token', req.path);
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Token verification failed',
        service: 'product-service'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      recordError('auth_token_expired', req.path);
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Please log in again',
        service: 'product-service'
      });
    }

    // Log unexpected authentication errors
    console.error('Authentication error:', error);
    recordError('auth_server_error', req.path);
    
    return res.status(500).json({
      success: false,
      error: 'Authentication server error',
      message: 'Internal error during authentication',
      service: 'product-service'
    });
  }
};

/**
 * Optional authentication middleware
 * 
 * Similar to auth middleware but doesn't require authentication.
 * If a token is provided, it validates it and adds user info to request.
 * If no token is provided, it continues without user info.
 * 
 * Useful for endpoints that provide different responses based on authentication status.
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // If no auth header, continue without authentication
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);
  
  if (!token) {
    return next();
  }

  try {
    // Try to verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add user information to request object
    req.user = {
      id: decoded.id,
      name: decoded.name,
      role: decoded.role || 'client'
    };
    
    next();
  } catch (error) {
    // If token is invalid, log for debugging but continue without authentication
    // This allows the endpoint to work for both authenticated and unauthenticated users
    console.debug('Optional auth token validation failed:', error.message);
    next();
  }
};
