/**
 * User Routes for User Service
 * 
 * Handles user management operations including:
 * - User profile management
 * - User listing (admin only)
 * - User status management
 * 
 * @author User Service Team
 * @version 1.0.0
 */

import express from 'express';
import bcrypt from 'bcrypt';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { 
  authenticate, 
  requireManager 
} from '@log430/shared/middleware/auth.js';
import { logger } from '@log430/shared/utils/logger.js';
import { 
  ValidationError, 
  NotFoundError,
  ConflictError,
  asyncHandler 
} from '@log430/shared/middleware/errorHandler.js';

const router = express.Router();
const prisma = new PrismaClient();

// Password hashing configuration
const SALT_ROUNDS = 12;

/**
 * Validation Rules
 */
const updateProfileValidation = [
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
];

const changePasswordValidation = [
  body('currentPassword')
    .isLength({ min: 1 })
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

const userIdValidation = [
  param('userId')
    .isUUID()
    .withMessage('Valid user ID is required')
];

const userStatusValidation = [
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean value')
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
 * GET /users/profile
 * Get current user's profile
 */
router.get('/profile',
  authenticate,
  asyncHandler(async (req, res) => {
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
      throw new NotFoundError('User not found');
    }
    
    logger.info('User profile retrieved', { 
      userId: user.id, 
      email: user.email 
    });
    
    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: { user },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * PUT /users/profile
 * Update current user's profile
 */
router.put('/profile',
  authenticate,
  updateProfileValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { firstName, lastName, email } = req.body;
    const userId = req.user.id;
    
    logger.info('Profile update attempt', { 
      userId, 
      email: req.user.email,
      updates: Object.keys(req.body)
    });
    
    try {
      // Check if email is being changed and if it's already taken
      if (email && email !== req.user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email }
        });
        
        if (existingUser) {
          throw new ConflictError('Email already in use');
        }
      }
      
      // Update user profile
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(email && { email }),
          updatedAt: new Date()
        },
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
      
      logger.info('Profile updated successfully', { 
        userId, 
        email: updatedUser.email 
      });
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      recordUserOperation('profile_update', 'failure');
      throw error;
    }
  })
);

/**
 * POST /users/change-password
 * Change user's password
 */
router.post('/change-password',
  authenticate,
  changePasswordValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    logger.info('Password change attempt', { 
      userId, 
      email: req.user.email 
    });
    
    try {
      // Get current user with password
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        throw new NotFoundError('User not found');
      }
      
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
      if (!isCurrentPasswordValid) {
        recordUserOperation('password_change', 'failure');
        throw new UnauthorizedError('Current password is incorrect');
      }
      
      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
      
      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { 
          password: hashedNewPassword,
          updatedAt: new Date()
        }
      });
      
      recordUserOperation('password_change', 'success');
      
      logger.info('Password changed successfully', { 
        userId, 
        email: user.email 
      });
      
      res.json({
        success: true,
        message: 'Password changed successfully',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      recordUserOperation('password_change', 'failure');
      throw error;
    }
  })
);

/**
 * GET /users
 * Get list of users (manager only)
 */
router.get('/',
  authenticate,
  requireManager,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search;
    const role = req.query.role;
    const isActive = req.query.isActive;
    
    // Build filter conditions
    const where = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (role) {
      where.role = role;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
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
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);
    
    recordUserOperation('user_list', 'success');
    
    logger.info('User list retrieved', { 
      requestedBy: req.user.email,
      totalUsers: totalCount,
      page,
      limit
    });
    
    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * GET /users/:userId
 * Get specific user (self or manager only)
 */
router.get('/:userId',
  authenticate,
  userIdValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      throw new NotFoundError('User not found');
    }
    
    recordUserOperation('user_view', 'success');
    
    logger.info('User retrieved', { 
      requestedBy: req.user.email,
      targetUser: user.email
    });
    
    res.json({
      success: true,
      message: 'User retrieved successfully',
      data: { user },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * PUT /users/:userId/status
 * Update user status (manager only)
 */
router.put('/:userId/status',
  authenticate,
  requireManager,
  userIdValidation,
  userStatusValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { isActive } = req.body;
    
    logger.info('User status update attempt', { 
      requestedBy: req.user.email,
      targetUserId: userId,
      newStatus: isActive
    });
    
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { 
          isActive,
          updatedAt: new Date()
        },
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
      
      recordUserOperation('user_status_update', 'success');
      
      logger.info('User status updated successfully', { 
        requestedBy: req.user.email,
        targetUser: updatedUser.email,
        newStatus: isActive
      });
      
      res.json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: { user: updatedUser },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      recordUserOperation('user_status_update', 'failure');
      throw error;
    }
  })
);

/**
 * GET /users/stats/overview
 * Get user statistics (manager only)
 */
router.get('/stats/overview',
  authenticate,
  requireManager,
  asyncHandler(async (req, res) => {
    const [
      totalUsers,
      activeUsers,
      clientUsers,
      managerUsers,
      recentRegistrations
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'client' } }),
      prisma.user.count({ where: { role: 'manager' } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      })
    ]);
    
    const stats = {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      usersByRole: {
        client: clientUsers,
        manager: managerUsers
      },
      recentRegistrations
    };
    
    recordUserOperation('user_stats', 'success');
    
    logger.info('User statistics retrieved', { 
      requestedBy: req.user.email,
      stats
    });
    
    res.json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: { stats },
      timestamp: new Date().toISOString()
    });
  })
);

export default router;
