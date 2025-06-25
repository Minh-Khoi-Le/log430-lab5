/**
 * Shared Authentication Middleware
 * 
 * Provides JWT token validation and user authentication across all microservices.
 * Includes role-based access control and token refresh functionality.
 * 
 * @author Log430 Lab5 Team
 * @version 1.0.0
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger.js';
import { UnauthorizedError, ForbiddenError } from './errorHandler.js';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const JWT_ISSUER = process.env.JWT_ISSUER || 'log430-microservices';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'log430-system';

/**
 * Hash password using bcrypt
 * 
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 * 
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Generate JWT Access Token
 * 
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
export const generateAccessToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    storeId: user.storeId,
    type: 'access'
  };
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
};

/**
 * Generate JWT Refresh Token
 * 
 * @param {Object} user - User object
 * @returns {string} JWT refresh token
 */
export const generateRefreshToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    type: 'refresh'
  };
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
};

/**
 * Verify JWT Token
 * 
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });
  } catch (error) {
    logger.warn('Token verification failed', { error: error.message });
    throw error;
  }
};

/**
 * Extract token from request
 * 
 * @param {Object} req - Express request object
 * @returns {string|null} JWT token or null
 */
export const extractToken = (req) => {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check query parameter
  if (req.query.token) {
    return req.query.token;
  }
  
  // Check cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  return null;
};

/**
 * Authentication Middleware
 * 
 * Validates JWT token and adds user information to request
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        url: req.url,
        method: req.method,
        ip: req.ip
      });
      throw new UnauthorizedError('Authentication token required');
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Check if token is access token
    if (decoded.type !== 'access') {
      logger.warn('Authentication failed: Invalid token type', {
        tokenType: decoded.type,
        url: req.url,
        method: req.method,
        ip: req.ip
      });
      throw new UnauthorizedError('Invalid token type');
    }
    
    // Add user information to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      storeId: decoded.storeId
    };
    
    logger.debug('User authenticated successfully', {
      userId: decoded.id,
      email: decoded.email,
      role: decoded.role,
      url: req.url,
      method: req.method
    });
    
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else if (error.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid authentication token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Authentication token has expired'));
    } else {
      logger.error('Authentication middleware error', { error: error.message });
      next(new UnauthorizedError('Authentication failed'));
    }
  }
};

/**
 * Optional Authentication Middleware
 * 
 * Validates JWT token if present, but doesn't require it
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      // No token provided, continue without authentication
      return next();
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Check if token is access token
    if (decoded.type === 'access') {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        storeId: decoded.storeId
      };
      
      logger.debug('Optional authentication successful', {
        userId: decoded.id,
        email: decoded.email
      });
    }
    
    next();
  } catch (error) {
    // Log the error but don't fail the request
    logger.debug('Optional authentication failed', { error: error.message });
    next();
  }
};

/**
 * Role-based Authorization Middleware
 * 
 * @param {...string} allowedRoles - Roles that are allowed to access the resource
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        logger.warn('Authorization failed: User not authenticated', {
          url: req.url,
          method: req.method,
          allowedRoles
        });
        throw new UnauthorizedError('Authentication required for authorization');
      }
      
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Authorization failed: Insufficient permissions', {
          userId: req.user.id,
          userRole: req.user.role,
          allowedRoles,
          url: req.url,
          method: req.method
        });
        throw new ForbiddenError('Insufficient permissions for this resource');
      }
      
      logger.debug('Authorization successful', {
        userId: req.user.id,
        userRole: req.user.role,
        allowedRoles
      });
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Store-based Authorization Middleware
 * 
 * Ensures user can only access resources from their own store
 */
export const authorizeStore = (req, res, next) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    
    // Admin can access all stores
    if (req.user.role === 'ADMIN') {
      return next();
    }
    
    // Get store ID from request (params, body, or query)
    const requestedStoreId = req.params.storeId || req.body.storeId || req.query.storeId;
    
    if (!requestedStoreId) {
      // If no store ID in request, allow access (for user's own store operations)
      return next();
    }
    
    // Check if user belongs to the requested store
    if (req.user.storeId && req.user.storeId.toString() !== requestedStoreId.toString()) {
      logger.warn('Store authorization failed', {
        userId: req.user.id,
        userStoreId: req.user.storeId,
        requestedStoreId,
        url: req.url,
        method: req.method
      });
      throw new ForbiddenError('Access denied to this store');
    }
    
    logger.debug('Store authorization successful', {
      userId: req.user.id,
      storeId: requestedStoreId
    });
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Authorization Middleware
 * 
 * Ensures only admin users can access the resource
 */
export const requireAdmin = authorize('ADMIN');

/**
 * Manager Authorization Middleware
 * 
 * Ensures only manager or admin users can access the resource
 */
export const requireManager = authorize('ADMIN', 'MANAGER');

/**
 * Employee Authorization Middleware
 * 
 * Ensures only employee, manager, or admin users can access the resource
 */
export const requireEmployee = authorize('ADMIN', 'MANAGER', 'EMPLOYEE');

/**
 * API Key Authentication Middleware
 * 
 * For service-to-service communication
 */
export const authenticateApiKey = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];
    
    if (!apiKey) {
      throw new UnauthorizedError('API key required');
    }
    
    if (!validApiKeys.includes(apiKey)) {
      logger.warn('Invalid API key attempt', {
        apiKey,
        ip: req.ip,
        url: req.url,
        method: req.method
      });
      throw new UnauthorizedError('Invalid API key');
    }
    
    // Mark request as service-to-service
    req.isServiceRequest = true;
    
    logger.debug('API key authentication successful', {
      url: req.url,
      method: req.method
    });
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Rate Limiting by User
 * 
 * Simple in-memory rate limiting (use Redis in production)
 */
const userRequestCounts = new Map();

export const rateLimitByUser = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    try {
      const userId = req.user ? req.user.id : req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Clean old entries
      for (const [key, data] of userRequestCounts.entries()) {
        if (data.lastRequest < windowStart) {
          userRequestCounts.delete(key);
        }
      }
      
      // Get or create user request data
      let userData = userRequestCounts.get(userId);
      if (!userData) {
        userData = { count: 0, firstRequest: now, lastRequest: now };
        userRequestCounts.set(userId, userData);
      }
      
      // Reset if outside window
      if (userData.firstRequest < windowStart) {
        userData.count = 0;
        userData.firstRequest = now;
      }
      
      // Check rate limit
      if (userData.count >= maxRequests) {
        logger.warn('Rate limit exceeded', {
          userId,
          count: userData.count,
          maxRequests,
          windowMs
        });
        throw new UnauthorizedError('Rate limit exceeded. Please try again later.');
      }
      
      // Increment counter
      userData.count++;
      userData.lastRequest = now;
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to log authentication events
 */
export const logAuthEvents = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Log successful authentication
    if (res.statusCode === 200 && req.path.includes('login')) {
      logger.info('User login successful', {
        email: req.body.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    
    // Log failed authentication
    if (res.statusCode === 401 || res.statusCode === 403) {
      logger.warn('Authentication/Authorization failed', {
        url: req.url,
        method: req.method,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};
