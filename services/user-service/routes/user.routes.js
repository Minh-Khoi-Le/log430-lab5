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
import { body, param, query, validationResult } from 'express-validator';
import { 
  authenticate, 
  requireManager,
  logger,
  BaseError,
  asyncHandler
} from '../../shared/index.js';
import { UserService } from '../services/user.service.js';

const router = express.Router();

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
    throw new BaseError('Validation failed', 400, { errors: errors.array() });
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
    const user = await UserService.getUserById(req.user.id);
    
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
    
    // Update user profile using UserService
    const updatedUser = await UserService.updateUserProfile(userId, {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(email && { email })
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
    
    // Change password using UserService
    await UserService.changePassword(userId, currentPassword, newPassword);
    
    logger.info('Password changed successfully', { 
      userId, 
      email: req.user.email 
    });
    
    res.json({
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    });
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
    const role = req.query.role;
    const isActive = req.query.isActive;
    
    // Build filter options
    const options = { page, limit };
    if (role) options.role = role;
    if (isActive !== undefined) options.isActive = isActive === 'true';
    
    // Get users using UserService
    const result = await UserService.getAllUsers(options);
    
    logger.info('User list retrieved', { 
      requestedBy: req.user.email,
      totalUsers: result.total,
      page,
      limit
    });
    
    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users: result.users,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.totalPages
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
    
    // Get user using UserService
    const user = await UserService.getUserById(userId);
    
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
    
    // Update user status using UserService
    const updatedUser = await UserService.updateUserStatus(userId, isActive);
    
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
    // Get user statistics using UserService
    const stats = await UserService.getUserStats();
    
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
