/**
 * Product Controller
 * 
 * The controller uses the product service to perform actual data operations
 * and formats the responses appropriately for the API.
 */

import * as service from '../services/product.service.js';
import { ApiError } from '../middleware/errorHandler.js';
import { productOperations } from '../middleware/metrics.js';

/**
 * List Products Controller
 * 
 * Retrieves a paginated and optionally sorted list of products.
 * 
 * @param {Request} req - Express request object with query parameters
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function list(req, res, next) {
  try {
    const { page = 1, size = 10, sort } = req.query;
    const products = await service.list({ page, size, sort });
    productOperations.labels('list', 'success').inc();
    res.json(products);
  } catch (error) {
    productOperations.labels('list', 'error').inc();
    next(error);
  }
}

/**
 * Get Product Controller
 * 
 * Retrieves detailed information about a specific product by ID.
 * 
 * @param {Request} req - Express request object with product ID parameter
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function get(req, res, next) {
  try {
    const product = await service.get(req.params.id);
    if (!product) {
      productOperations.labels('get', 'not_found').inc();
      throw new ApiError(404, 'Product not found');
    }
    productOperations.labels('get', 'success').inc();
    res.json(product);
  } catch (error) {
    if (error.status !== 404) {
      productOperations.labels('get', 'error').inc();
    }
    next(error);
  }
}

/**
 * Create Product Controller
 * 
 * Creates a new product with the provided data.
 * Automatically creates stock entries with quantity 0 for all stores.
 * 
 * @param {Request} req - Express request object with product data in body
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function create(req, res, next) {
  try {
    const product = await service.create(req.body);
    productOperations.labels('create', 'success').inc();
    res.status(201).json(product);
  } catch (error) {
    productOperations.labels('create', 'error').inc();
    next(error);
  }
}

/**
 * Update Product Controller
 * 
 * Updates an existing product with the provided data.
 * 
 * @param {Request} req - Express request object with product ID parameter and update data in body
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function update(req, res, next) {
  try {
    const product = await service.update(req.params.id, req.body);
    if (!product) {
      productOperations.labels('update', 'not_found').inc();
      throw new ApiError(404, 'Product not found');
    }
    productOperations.labels('update', 'success').inc();
    res.json(product);
  } catch (error) {
    if (error.status !== 404) {
      productOperations.labels('update', 'error').inc();
    }
    next(error);
  }
}

/**
 * Remove Product Controller
 * 
 * Deletes a product by ID.
 * 
 * @param {Request} req - Express request object with product ID parameter
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function remove(req, res, next) {
  try {
    const success = await service.remove(req.params.id);
    if (!success) {
      productOperations.labels('delete', 'not_found').inc();
      throw new ApiError(404, 'Product not found');
    }
    productOperations.labels('delete', 'success').inc();
    res.sendStatus(204);
  } catch (error) {
    // Check for foreign key constraint error
    if (error.code === 'P2003' || error.code === 'P2014') {
      productOperations.labels('delete', 'conflict').inc();
      // Convert DB error to API error with 409 Conflict status
      next(new ApiError(409, 'Cannot delete product: it is referenced in stock or sales records'));
    } else if (error.status !== 404) {
      productOperations.labels('delete', 'error').inc();
      next(error);
    } else {
      next(error);
    }
  }
} 