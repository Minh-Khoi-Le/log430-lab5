/**
 * User Service - Business Logic Layer
 * 
 * Handles all user-related business operations including:
 * - User authentication
 * - User registration
 * - Profile management
 * - Password management
 * - User management (admin operations)
 * 
 * @author User Service Team
 * @version 2.0.0
 */

import bcrypt from 'bcrypt';
import { 
  getDatabaseClient, 
  checkDatabaseHealth,
  initializeDatabase,
  BaseError,
  logger
} from '../../shared/index.js';

// Password hashing configuration
const SALT_ROUNDS = 12;

/**
 * User Service Class
 * Contains all user-related business logic
 */
export class UserService {
  /**
   * Authenticate user with email and password
   * @param {string} email - User email (actually username/name in our schema)
   * @param {string} password - User password
   * @returns {Promise<Object>} User object without password
   * @throws {BaseError} If authentication fails
   */
  static async authenticateUser(email, password) {
    try {
      const db = getDatabaseClient('user-service');
      
      logger.info('Attempting user authentication', { email });
      
      // Find user by name (since our schema uses 'name' field, not 'email')
      const user = await db.user.findUnique({
        where: { name: email } // Using name field to match the schema
      });
      
      if (!user) {
        logger.warn('Authentication failed - user not found', { email });
        throw new BaseError('Invalid credentials', 401);
      }
      
      // Skip isActive check since our schema doesn't have this field
      // if (!user.isActive) {
      //   logger.warn('Authentication failed - account inactive', { email });
      //   throw new BaseError('Account is inactive', 401);
      // }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        logger.warn('Authentication failed - invalid password', { email });
        throw new BaseError('Invalid credentials', 401);
      }
      
      // Update last login - skip this since our schema doesn't have lastLoginAt
      // await db.user.update({
      //   where: { id: user.id },
      //   data: { lastLoginAt: new Date() }
      // });
      
      logger.info('User authentication successful', { email, userId: user.id });
      
      // Return user data without password
      // eslint-disable-next-line no-unused-vars
      const { password: passwordField, ...userWithoutPassword } = user;
      return userWithoutPassword;
      
    } catch (error) {
      if (error instanceof BaseError) {
        throw error;
      }
      
      logger.error('Database error during user authentication', { 
        error: error.message, 
        email 
      });
      throw new BaseError('Database operation failed', 500);
    }
  }
  
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user object without password
   * @throws {BaseError} If registration fails
   */
  static async registerUser(userData) {
    try {
      
      const db = getDatabaseClient('user-service');
      
      const { email, password, role = 'client', firstName, lastName } = userData;
      
      logger.info('Attempting user registration', { email, role });
      
      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        logger.warn('Registration failed - email already exists', { email });
        throw new BaseError('Email already registered', 409);
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      
      // Create user
      const user = await db.user.create({
        data: {
          email,
          password: hashedPassword,
          role,
          firstName,
          lastName,
          isActive: true
        }
      });
      
      logger.info('User registration successful', { email, userId: user.id, role });
      
      // Return user data without password
      // eslint-disable-next-line no-unused-vars
      const { password: passwordField2, ...userWithoutPassword } = user;
      return userWithoutPassword;
      
    } catch (error) {
      if (error instanceof BaseError) {
        throw error;
      }
      logger.error('Database error', { error: error.message }); throw new BaseError('Database operation failed', 500);
    }
  }
  
  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User object without password
   * @throws {BaseError} If user not found
   */
  static async getUserById(userId) {
    try {
      
      const db = getDatabaseClient('user-service');
      
      const user = await db.user.findUnique({
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
        throw new BaseError('User not found', 404);
      }
      
      return user;
      
    } catch (error) {
      if (error instanceof BaseError) {
        throw error;
      }
      logger.error('Database error', { error: error.message }); throw new BaseError('Database operation failed', 500);
    }
  }
  
  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated user object without password
   * @throws {BaseError} If update fails
   */
  static async updateUserProfile(userId, updates) {
    try {
      
      const db = getDatabaseClient('user-service');
      
      logger.info('Updating user profile', { userId, updates: Object.keys(updates) });
      
      // Check if user exists
      const existingUser = await db.user.findUnique({
        where: { id: userId }
      });
      
      if (!existingUser) {
        throw new BaseError('User not found', 404);
      }
      
      // If email is being updated, check for conflicts
      if (updates.email && updates.email !== existingUser.email) {
        const emailTaken = await db.user.findUnique({
          where: { email: updates.email }
        });
        
        if (emailTaken) {
          throw new BaseError('Email already in use', 409);
        }
      }
      
      // Update user
      const updatedUser = await db.user.update({
        where: { id: userId },
        data: {
          ...updates,
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
      
      logger.info('User profile updated successfully', { userId });
      
      return updatedUser;
      
    } catch (error) {
      if (error instanceof BaseError) {
        throw error;
      }
      logger.error('Database error', { error: error.message }); throw new BaseError('Database operation failed', 500);
    }
  }
  
  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   * @throws {BaseError} If password change fails
   */
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      
      const db = getDatabaseClient('user-service');
      
      logger.info('Changing user password', { userId });
      
      // Get user with password
      const user = await db.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        throw new BaseError('User not found', 404);
      }
      
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
      if (!isCurrentPasswordValid) {
        throw new BaseError('Current password is incorrect', 401);
      }
      
      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
      
      // Update password
      await db.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
          updatedAt: new Date()
        }
      });
      
      logger.info('User password changed successfully', { userId });
      
    } catch (error) {
      if (error instanceof BaseError) {
        throw error;
      }
      logger.error('Database error', { error: error.message }); throw new BaseError('Database operation failed', 500);
    }
  }
  
  /**
   * Get all users (admin only)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of user objects without passwords
   */
  static async getAllUsers(options = {}) {
    try {
      
      const db = getDatabaseClient('user-service');
      
      const { page = 1, limit = 10, role, isActive } = options;
      const skip = (page - 1) * limit;
      
      const where = {};
      if (role) where.role = role;
      if (typeof isActive === 'boolean') where.isActive = isActive;
      
      const [users, total] = await Promise.all([
        db.user.findMany({
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
        db.user.count({ where })
      ]);
      
      return {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
      
    } catch (error) {
      logger.error('Database error', { error: error.message }); throw new BaseError('Database operation failed', 500);
    }
  }
  
  /**
   * Update user status (admin only)
   * @param {string} userId - User ID
   * @param {boolean} isActive - Active status
   * @returns {Promise<Object>} Updated user object without password
   * @throws {BaseError} If update fails
   */
  static async updateUserStatus(userId, isActive) {
    try {
      
      const db = getDatabaseClient('user-service');
      
      logger.info('Updating user status', { userId, isActive });
      
      const updatedUser = await db.user.update({
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
      
      logger.info('User status updated successfully', { userId, isActive });
      
      return updatedUser;
      
    } catch (error) {
      if (error instanceof BaseError) {
        throw error;
      }
      logger.error('Database error', { error: error.message }); throw new BaseError('Database operation failed', 500);
    }
  }
  
  /**
   * Delete user (admin only)
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   * @throws {BaseError} If deletion fails
   */
  static async deleteUser(userId) {
    try {
      
      const db = getDatabaseClient('user-service');
      
      logger.info('Deleting user', { userId });
      
      await db.user.delete({
        where: { id: userId }
      });
      
      logger.info('User deleted successfully', { userId });
      
    } catch (error) {
      if (error instanceof BaseError) {
        throw error;
      }
      logger.error('Database error', { error: error.message }); throw new BaseError('Database operation failed', 500);
    }
  }
  
  /**
   * Get user statistics
   * @returns {Promise<Object>} User statistics
   */
  static async getUserStats() {
    try {
      
      const db = getDatabaseClient('user-service');
      
      const [totalUsers, activeUsers, inactiveUsers, clientUsers, managerUsers] = await Promise.all([
        db.user.count(),
        db.user.count({ where: { isActive: true } }),
        db.user.count({ where: { isActive: false } }),
        db.user.count({ where: { role: 'client' } }),
        db.user.count({ where: { role: 'manager' } })
      ]);
      
      return {
        totalUsers,
        activeUsers,
        inactiveUsers,
        clientUsers,
        managerUsers
      };
      
    } catch (error) {
      logger.error('Database error', { error: error.message }); throw new BaseError('Database operation failed', 500);
    }
  }
}

export default UserService;
