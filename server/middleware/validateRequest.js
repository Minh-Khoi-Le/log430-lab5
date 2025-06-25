import { validationResult } from 'express-validator';
import { ApiError } from './errorHandler.js';

/**
 * Request Validation Middleware Function
 * 
 * Checks if the request contains any validation errors from express-validator.
 * If errors are found, throws an ApiError with 400 status code and the validation errors.
 * If no errors are found, passes control to the next middleware or controller.
 * 
 * @param {Request} req - Express request object containing validation results
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 * @throws {ApiError} If validation fails
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }
  next();
}; 