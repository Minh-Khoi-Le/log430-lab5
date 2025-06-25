/**
 * Authentication Routes for User Service
 * 
 * Handles user authentication operations including:
 * - User login
 * - User registration
 * - Token refresh
 * - Password reset
 * 
 * @author User Service Team
 * @version 1.0.0
 */

import express from 'express';
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyToken,
  authenticate 
} from '../middleware/auth.js';
import { 
  recordUserOperation, 
  recordAuthAttempt, 
  recordTokenIssued 
} from '../middleware/metrics.js';
import { logger } from '../utils/logger.js';
import { 
  ValidationError, 
  UnauthorizedError, 
  ConflictError,
  asyncHandler 
} from '../middleware/errorHandler.js';

const router = express.Router();
const prisma = new PrismaClient();

// Password hashing configuration
const SALT_ROUNDS = 12;

/**
 * Validation Rules
 */
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required')
];

const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('role')
    .optional()
    .isIn(['client', 'manager'])
    .withMessage('Role must be either client or manager'),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
];

const refreshTokenValidation = [
  body('refreshToken')
    .isLength({ min: 1 })
    .withMessage('Refresh token is required')
];

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  next();
};

/**
 * POST /auth/login
 * User authentication endpoint
 */
router.post('/login', 
  loginValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    logger.info('Login attempt', { email, ip: req.ip });
    
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email }
      });
      
      if (!user) {
        recordAuthAttempt('failure', 'password');
        recordUserOperation('login', 'failure');
        logger.auth(email, false, 'User not found');
        throw new UnauthorizedError('Invalid credentials');
      }
      
      if (!user.isActive) {
        recordAuthAttempt('failure', 'password');
        recordUserOperation('login', 'failure');
        logger.auth(email, false, 'Account inactive');
        throw new UnauthorizedError('Account is inactive');
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        recordAuthAttempt('failure', 'password');
        recordUserOperation('login', 'failure');
        logger.auth(email, false, 'Invalid password');
        throw new UnauthorizedError('Invalid credentials');
      }
      
      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });
      
      // Record successful authentication
      recordAuthAttempt('success', 'password');
      recordUserOperation('login', 'success');
      recordTokenIssued('access');
      recordTokenIssued('refresh');
      logger.auth(email, true);
      
      // Return user data and tokens (excluding password)
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userWithoutPassword,
          tokens: {
            access: accessToken,
            refresh: refreshToken
          }
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      recordAuthAttempt('failure', 'password');
      recordUserOperation('login', 'failure');
      throw error;
    }
  })
);

/**
 * POST /auth/register
 * User registration endpoint
 */
router.post('/register',
  registerValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { email, password, role = 'client', firstName, lastName } = req.body;
    
    logger.info('Registration attempt', { email, role, ip: req.ip });
    
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        recordUserOperation('register', 'failure');
        logger.register(email, role, false);
        throw new ConflictError('Email already registered');
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      
      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role,
          firstName,
          lastName,
          isActive: true
        }
      });
      
      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      
      // Record successful registration
      recordUserOperation('register', 'success');
      recordTokenIssued('access');
      recordTokenIssued('refresh');
      logger.register(email, role, true);
      
      // Return user data and tokens (excluding password)
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: userWithoutPassword,
          tokens: {
            access: accessToken,
            refresh: refreshToken
          }
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      recordUserOperation('register', 'failure');
      throw error;
    }
  })
);

/**
 * POST /auth/refresh
 * Token refresh endpoint
 */
router.post('/refresh',
  refreshTokenValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    
    logger.info('Token refresh attempt', { ip: req.ip });
    
    try {
      // Verify refresh token
      const decoded = verifyToken(refreshToken);
      
      if (decoded.type !== 'refresh') {
        recordUserOperation('token_refresh', 'failure');
        throw new UnauthorizedError('Invalid token type');
      }
      
      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });
      
      if (!user || !user.isActive) {
        recordUserOperation('token_refresh', 'failure');
        throw new UnauthorizedError('User not found or inactive');
      }
      
      // Generate new access token
      const newAccessToken = generateAccessToken(user);
      
      // Record successful token refresh
      recordUserOperation('token_refresh', 'success');
      recordTokenIssued('access');
      
      logger.info('Token refreshed successfully', { 
        userId: user.id, 
        email: user.email 
      });
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: {
            access: newAccessToken,
            refresh: refreshToken // Return the same refresh token
          }
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      recordUserOperation('token_refresh', 'failure');
      throw error;
    }
  })
);

/**
 * POST /auth/logout
 * User logout endpoint (for logging purposes)
 */
router.post('/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    logger.info('User logout', { 
      userId: req.user.id, 
      email: req.user.email 
    });
    
    recordUserOperation('logout', 'success');
    
    res.json({
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * GET /auth/me
 * Get current user information
 */
router.get('/me',
  authenticate,
  asyncHandler(async (req, res) => {
    // Get fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true
      }
    });
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    
    recordUserOperation('profile_view', 'success');
    
    res.json({
      success: true,
      message: 'User information retrieved successfully',
      data: { user },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * GET /auth/validate
 * Validate current token
 */
router.get('/validate',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role
        },
        tokenValid: true
      },
      timestamp: new Date().toISOString()
    });
  })
);

export default router;
