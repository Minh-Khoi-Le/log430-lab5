/**
 * Authentication Routes for User Service (Refactored)
 * 
 * Handles user authentication operations using shared components.
 * All validation, error handling, and utilities are imported from @log430/shared.
 * 
 * @author Log430 Lab5 Team (Refactored)
 * @version 2.0.0
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';

// Import shared components
import {
  logger,
  validate,
  validateEmail,
  validatePassword,
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  authenticate,
  asyncHandler,
  ValidationError,
  UnauthorizedError,
  ConflictError,
  NotFoundError
} from '@log430/shared';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Validation Rules using shared validators
 */
const loginValidation = [
  ...validateEmail(),
  ...validatePassword()
];

const registerValidation = [
  ...validateEmail(),
  ...validatePassword(),
  validate([
    body('firstName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters'),
    body('role')
      .optional()
      .isIn(['ADMIN', 'MANAGER', 'EMPLOYEE'])
      .withMessage('Role must be ADMIN, MANAGER, or EMPLOYEE')
  ])
];

/**
 * POST /auth/login
 * User login endpoint
 */
router.post('/login', 
  validate(loginValidation),
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { email, password } = req.body;

    logger.info('Login attempt', { email });

    try {
      // Find user by email
      const dbStart = Date.now();
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        logger.warn('Login failed - user not found', { email });
        throw new UnauthorizedError('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      
      if (!isPasswordValid) {
        logger.warn('Login failed - invalid password', { email, userId: user.id });
        throw new UnauthorizedError('Invalid email or password');
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Update last login
      const updateStart = Date.now();
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          lastLoginAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      logger.info('User login successful', { 
        userId: user.id, 
        email: user.email,
        role: user.role,
        duration: Date.now() - startTime
      });

      // Return user data and tokens (excluding password)
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            ...userWithoutPassword,
            lastLoginAt: new Date()
          },
          accessToken,
          refreshToken
        }
      });

    } catch (error) {
      throw error;
    }
  })
);

/**
 * POST /auth/register
 * User registration endpoint
 */
router.post('/register', 
  validate(registerValidation),
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { email, password, firstName, lastName, role = 'EMPLOYEE' } = req.body;

    logger.info('Registration attempt', { email, role });

    try {
      // Check if user already exists
      const dbStart = Date.now();
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        logger.warn('Registration failed - email already exists', { email });
        throw new ConflictError('Email already registered');
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const createStart = Date.now();
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      // Generate tokens
      const accessToken = generateAccessToken(newUser);
      const refreshToken = generateRefreshToken(newUser);
      
      logger.info('User registration successful', {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        duration: Date.now() - startTime
      });

      // Return user data and tokens (excluding password)
      const { password: _, ...userWithoutPassword } = newUser;
      
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: userWithoutPassword,
          accessToken,
          refreshToken
        }
      });

    } catch (error) {
      throw error;
    }
  })
);

/**
 * POST /auth/refresh
 * Token refresh endpoint
 */
router.post('/refresh',
  validate([
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required')
  ]),
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { refreshToken } = req.body;

    try {
      // Verify refresh token
      const decoded = verifyToken(refreshToken);
      
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }

      // Find user
      const dbStart = Date.now();
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Generate new tokens
      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);
      
      logger.info('Token refresh successful', {
        userId: user.id,
        email: user.email,
        duration: Date.now() - startTime
      });

      res.json({
        success: true,
        message: 'Token refresh successful',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      });

    } catch (error) {
      throw error;
    }
  })
);

/**
 * POST /auth/logout
 * User logout endpoint (optional - for logging purposes)
 */
router.post('/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    
    logger.info('User logout', {
      userId: req.user.id,
      email: req.user.email,
      duration: Date.now() - startTime
    });

    res.json({
      success: true,
      message: 'Logout successful'
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
    const startTime = Date.now();

    try {
      // Get fresh user data
      const dbStart = Date.now();
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          storeId: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true
        }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      logger.info('get_current_user', 'success', Date.now() - startTime);

      res.json({
        success: true,
        data: { user }
      });

    } catch (error) {
      logger.info('get_current_user', 'failed');
      throw error;
    }
  })
);

export default router;
