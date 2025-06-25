import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler.js';

// JWT secret key from environment variables or fallback to default (for development only)
const SECRET = process.env.JWT_SECRET || 'lab4-secret';

/**
 * Authentication Middleware Function
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 * @throws {ApiError} If authentication fails
 */
export const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new ApiError(401, 'Authentication required');
    }

    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, 'Invalid token'));
    } else {
      next(error);
    }
  }
}; 