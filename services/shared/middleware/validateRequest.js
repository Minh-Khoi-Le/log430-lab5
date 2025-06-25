/**
 * Shared Validation Middleware
 * 
 * Provides request validation using express-validator and custom validators.
 * Includes common validation rules and error formatting.
 * 
 * @author Log430 Lab5 Team
 * @version 1.0.0
 */

import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from './errorHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    
    logger.warn('Validation failed', {
      url: req.url,
      method: req.method,
      errors: errorDetails,
      body: req.body
    });
    
    throw new ValidationError('Validation failed', errorDetails);
  }
  
  next();
};

/**
 * Common validation chains
 */

// ID validation
export const validateId = (paramName = 'id') => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`)
    .notEmpty()
    .withMessage(`${paramName} is required`)
];

export const validateNumericId = (paramName = 'id') => [
  param(paramName)
    .isInt({ min: 1 })
    .withMessage(`${paramName} must be a positive integer`)
    .toInt()
];

// Email validation
export const validateEmail = (fieldName = 'email') => [
  body(fieldName)
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage('Email address is too long')
];

// Password validation
export const validatePassword = (fieldName = 'password') => [
  body(fieldName)
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character')
];

// Name validation
export const validateName = (fieldName = 'name') => [
  body(fieldName)
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage(`${fieldName} must be between 1 and 100 characters`)
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage(`${fieldName} can only contain letters, spaces, hyphens, apostrophes, and periods`)
];

// Phone validation
export const validatePhone = (fieldName = 'phone') => [
  body(fieldName)
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

// Date validation
export const validateDate = (fieldName = 'date') => [
  body(fieldName)
    .isISO8601()
    .withMessage(`${fieldName} must be a valid ISO 8601 date`)
    .toDate()
];

export const validateDateRange = (startField = 'startDate', endField = 'endDate') => [
  body(startField)
    .isISO8601()
    .withMessage(`${startField} must be a valid ISO 8601 date`)
    .toDate(),
  body(endField)
    .isISO8601()
    .withMessage(`${endField} must be a valid ISO 8601 date`)
    .toDate()
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body[startField])) {
        throw new Error(`${endField} must be after ${startField}`);
      }
      return true;
    })
];

// Numeric validation
export const validatePositiveNumber = (fieldName = 'amount') => [
  body(fieldName)
    .isFloat({ min: 0 })
    .withMessage(`${fieldName} must be a positive number`)
    .toFloat()
];

export const validatePositiveInteger = (fieldName = 'quantity') => [
  body(fieldName)
    .isInt({ min: 1 })
    .withMessage(`${fieldName} must be a positive integer`)
    .toInt()
];

export const validatePrice = (fieldName = 'price') => [
  body(fieldName)
    .isFloat({ min: 0 })
    .withMessage(`${fieldName} must be a positive number`)
    .custom(value => {
      // Check for max 2 decimal places
      if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
        throw new Error(`${fieldName} can have at most 2 decimal places`);
      }
      return true;
    })
    .toFloat()
];

// String validation
export const validateString = (fieldName, minLength = 1, maxLength = 255) => [
  body(fieldName)
    .trim()
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${fieldName} must be between ${minLength} and ${maxLength} characters`)
];

export const validateOptionalString = (fieldName, maxLength = 255) => [
  body(fieldName)
    .optional()
    .trim()
    .isLength({ max: maxLength })
    .withMessage(`${fieldName} must not exceed ${maxLength} characters`)
];

// Enum validation
export const validateEnum = (fieldName, allowedValues) => [
  body(fieldName)
    .isIn(allowedValues)
    .withMessage(`${fieldName} must be one of: ${allowedValues.join(', ')}`)
];

// Array validation
export const validateArray = (fieldName, minLength = 1, maxLength = 100) => [
  body(fieldName)
    .isArray({ min: minLength, max: maxLength })
    .withMessage(`${fieldName} must be an array with ${minLength} to ${maxLength} items`)
];

export const validateArrayOfIds = (fieldName) => [
  body(fieldName)
    .isArray({ min: 1 })
    .withMessage(`${fieldName} must be a non-empty array`),
  body(`${fieldName}.*`)
    .isUUID()
    .withMessage(`Each item in ${fieldName} must be a valid UUID`)
];

// URL validation
export const validateUrl = (fieldName = 'url') => [
  body(fieldName)
    .optional()
    .isURL({
      protocols: ['http', 'https'],
      require_protocol: true
    })
    .withMessage(`${fieldName} must be a valid URL`)
];

// File validation
export const validateFile = (fieldName = 'file', allowedTypes = []) => [
  body(fieldName)
    .custom((value, { req }) => {
      if (!req.file) {
        throw new Error(`${fieldName} is required`);
      }
      
      if (allowedTypes.length > 0 && !allowedTypes.includes(req.file.mimetype)) {
        throw new Error(`${fieldName} must be one of the following types: ${allowedTypes.join(', ')}`);
      }
      
      return true;
    })
];

// Pagination validation
export const validatePagination = () => [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('sortBy')
    .optional()
    .isString()
    .withMessage('SortBy must be a string'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('SortOrder must be either "asc" or "desc"')
];

// Search validation
export const validateSearch = () => [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
];

// JSON validation
export const validateJson = (fieldName) => [
  body(fieldName)
    .custom(value => {
      try {
        JSON.parse(value);
        return true;
      } catch (error) {
        throw new Error(`${fieldName} must be valid JSON`);
      }
    })
];

// Custom validators
export const validateUniqueEmail = (prisma) => [
  body('email')
    .custom(async (email, { req }) => {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      // Allow update for same user
      if (existingUser && existingUser.id !== req.params.id) {
        throw new Error('Email already exists');
      }
      
      return true;
    })
];

export const validateExists = (model, fieldName = 'id') => [
  body(fieldName)
    .custom(async (value, { req }) => {
      const record = await model.findUnique({
        where: { id: value }
      });
      
      if (!record) {
        throw new Error(`${fieldName} does not exist`);
      }
      
      return true;
    })
];

// Password confirmation validation
export const validatePasswordConfirmation = () => [
  body('passwordConfirmation')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    })
];

// Role validation
export const validateRole = () => [
  body('role')
    .isIn(['ADMIN', 'MANAGER', 'EMPLOYEE'])
    .withMessage('Role must be ADMIN, MANAGER, or EMPLOYEE')
];

// Store validation
export const validateStoreAccess = (prisma) => [
  body('storeId')
    .optional()
    .custom(async (storeId, { req }) => {
      if (!req.user) {
        throw new Error('Authentication required');
      }
      
      // Admin can access all stores
      if (req.user.role === 'ADMIN') {
        return true;
      }
      
      // Check if user belongs to the store
      if (req.user.storeId && req.user.storeId.toString() !== storeId.toString()) {
        throw new Error('Access denied to this store');
      }
      
      return true;
    })
];

// Sanitization helpers
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
};

export const sanitizeHtml = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '');
};

// Validation chains for common entities
export const validateUser = () => [
  ...validateEmail(),
  ...validatePassword(),
  ...validateName('firstName'),
  ...validateName('lastName'),
  ...validatePhone(),
  ...validateRole()
];

export const validateUserUpdate = () => [
  ...validateEmail(),
  ...validateName('firstName'),
  ...validateName('lastName'),
  ...validatePhone(),
  ...validateRole()
];

export const validateProduct = () => [
  ...validateString('name', 1, 200),
  ...validateOptionalString('description', 1000),
  ...validatePrice(),
  ...validatePositiveInteger('quantity'),
  ...validateString('category', 1, 100),
  ...validateOptionalString('brand', 100),
  ...validateOptionalString('sku', 50)
];

export const validateStore = () => [
  ...validateString('name', 1, 200),
  ...validateOptionalString('description', 1000),
  ...validateString('address', 1, 500),
  ...validateString('city', 1, 100),
  ...validateString('postalCode', 1, 20),
  ...validatePhone('phone')
];

export const validateSale = () => [
  ...validateArrayOfIds('items'),
  ...validatePositiveNumber('total'),
  ...validateEnum('paymentMethod', ['CASH', 'CARD', 'TRANSFER'])
];

// Export validation middleware factory
export const validate = (validations) => {
  return [
    ...validations,
    handleValidationErrors
  ];
};
