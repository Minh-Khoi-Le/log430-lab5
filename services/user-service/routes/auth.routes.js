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
import { body, validationResult } from 'express-validator';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyToken,
  authenticate,
  logger,
  BaseError,
  asyncHandler
} from '../../shared/index.js';
import { UserService } from '../services/user.service.js';

const router = express.Router();

// Password hashing configuration removed - now handled in UserService

/**
 * Validation Rules
 */
const loginValidation = [
  body('email')
    .isLength({ min: 1 })
    .withMessage('Username/email is required')
    .trim(),
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
    throw new BaseError('Validation failed', 400, { errors: errors.array() });
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
    
    // Authenticate user using UserService
    const user = await UserService.authenticateUser(email, password);
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Return user data and tokens
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        tokens: {
          access: accessToken,
          refresh: refreshToken
        }
      },
      timestamp: new Date().toISOString()
    });
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
    
    // Register user using UserService
    const user = await UserService.registerUser({
      email,
      password,
      role,
      firstName,
      lastName
    });
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        tokens: {
          access: accessToken,
          refresh: refreshToken
        }
      },
      timestamp: new Date().toISOString()
    });
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
    
    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      throw new BaseError('Invalid token type', 401);
    }
    
    // Get user from database using UserService
    const user = await UserService.getUserById(decoded.id);
    
    if (!user.isActive) {
      throw new BaseError('User account is inactive', 401);
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken(user);
    
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
    // Get fresh user data from database using UserService
    const user = await UserService.getUserById(req.user.id);
    
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
