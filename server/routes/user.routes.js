/**
 * User Routes
 * 
 * Base path: /api/v1/users
 * 
 * These routes are used by:
 * - Authentication/login
 */

import express from 'express';
import * as controller from '../controllers/user.controller.js';

const router = express.Router();

/**
 * POST /api/v1/users/login
 * 
 * Authenticate a user and return user details
 * 
 * Request body:
 * - name: User name (required)
 * - password: User password (required)
 * 
 * Used by:
 * - Login page
 */
router.post('/login', controller.login);

/**
 * GET /api/v1/users
 * 
 * List all users
 * 
 */
router.get('/', controller.list);

/**
 * GET /api/v1/users/:id
 * 
 * Get detailed information about a specific user
 * 
 * Path parameters:
 * - id: User ID
 * 
 */
router.get('/:id', controller.get);

/**
 * POST /api/v1/users
 * 
 * Create a new user
 * 
 * Request body:
 * - name: User name (required)
 * - role: User role (required) - 'client' or 'manager'
 * - password: User password (optional, defaults to "password")
 * 
 */
router.post('/', controller.create);

/**
 * GET /api/v1/users/:id/sales
 * 
 * Get sales history for a specific user (client)
 * 
 * Path parameters:
 * - id: User ID
 * 
 */
router.get('/:id/sales', controller.sales);

export default router; 