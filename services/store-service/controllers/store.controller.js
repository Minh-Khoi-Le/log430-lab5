/**
 * Store Controller for Store Service
 * 
 * This controller manages all store-related operations in the microservices architecture.
 * It provides endpoints for CRUD operations on stores and basic store management.
 * 
 * Features:
 * - Store CRUD operations (Create, Read, Update, Delete)
 * - Store listing and details retrieval
 * - Integration with metrics for monitoring
 * - Comprehensive error handling
 * 
 * @author Store Service Team
 * @version 1.0.0
 */

import StoreService from '../services/store.service.js';
import { ApiError } from '../middleware/errorHandler.js';
import { promClient } from '../middleware/metrics.js';

// Metrics for store operations
const storeOperationCounter = new promClient.Counter({
  name: 'store_operations_total',
  help: 'Total number of store operations',
  labelNames: ['operation', 'status']
});

const storeOperationDuration = new promClient.Histogram({
  name: 'store_operation_duration_seconds',
  help: 'Duration of store operations in seconds',
  labelNames: ['operation']
});

/**
 * List Stores Controller
 * 
 * Retrieves a paginated list of all stores with optional filtering.
 * Supports query parameters for pagination and basic filtering.
 * 
 * @param {Request} req - Express request object with optional query parameters
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * Query Parameters:
 * - page: Page number for pagination (default: 1)
 * - limit: Number of items per page (default: 10)
 * - search: Search term for store name filtering
 */
export async function list(req, res, next) {
  const timer = storeOperationDuration.startTimer({ operation: 'list' });
  
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    const result = await StoreService.getAllStores({
      page: parseInt(page),
      limit: parseInt(limit),
      search
    });
    
    storeOperationCounter.inc({ operation: 'list', status: 'success' });
    res.json({
      success: true,
      data: result.stores,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / parseInt(limit))
      }
    });
  } catch (error) {
    storeOperationCounter.inc({ operation: 'list', status: 'error' });
    next(error);
  } finally {
    timer();
  }
}

/**
 * Get Store Controller
 * 
 * Retrieves detailed information about a specific store by ID.
 * Returns comprehensive store data including location and operational details.
 * 
 * @param {Request} req - Express request object with store ID parameter
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function get(req, res, next) {
  const timer = storeOperationDuration.startTimer({ operation: 'get' });
  
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      throw new ApiError(400, 'Valid store ID is required');
    }
    
    const store = await StoreService.getStoreById(parseInt(id));
    
    if (!store) {
      storeOperationCounter.inc({ operation: 'get', status: 'not_found' });
      throw new ApiError(404, 'Store not found');
    }
    
    storeOperationCounter.inc({ operation: 'get', status: 'success' });
    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    storeOperationCounter.inc({ operation: 'get', status: 'error' });
    next(error);
  } finally {
    timer();
  }
}

/**
 * Create Store Controller
 * 
 * Creates a new store with the provided data.
 * Validates required fields and ensures data integrity.
 * 
 * @param {Request} req - Express request object with store data in body
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * Required Body Fields:
 * - name: Store name (string, 3-100 characters)
 * - address: Store address (string, 5-200 characters)
 * - city: City location (string, 2-50 characters)
 * - phone: Contact phone number (string, optional)
 * - email: Contact email (string, optional)
 */
export async function create(req, res, next) {
  const timer = storeOperationDuration.startTimer({ operation: 'create' });
  
  try {
    const storeData = req.body;
    
    // Validate required fields
    if (!storeData.name || storeData.name.length < 3 || storeData.name.length > 100) {
      throw new ApiError(400, 'Store name is required and must be between 3-100 characters');
    }
    
    if (!storeData.address || storeData.address.length < 5 || storeData.address.length > 200) {
      throw new ApiError(400, 'Store address is required and must be between 5-200 characters');
    }
    
    if (!storeData.city || storeData.city.length < 2 || storeData.city.length > 50) {
      throw new ApiError(400, 'Store city is required and must be between 2-50 characters');
    }
    
    // Optional email validation
    if (storeData.email && !isValidEmail(storeData.email)) {
      throw new ApiError(400, 'Invalid email format');
    }
    
    const store = await StoreService.createStore(storeData);
    
    storeOperationCounter.inc({ operation: 'create', status: 'success' });
    res.status(201).json({
      success: true,
      message: 'Store created successfully',
      data: store
    });
  } catch (error) {
    storeOperationCounter.inc({ operation: 'create', status: 'error' });
    next(error);
  } finally {
    timer();
  }
}

/**
 * Update Store Controller
 * 
 * Updates an existing store with the provided data.
 * Supports partial updates and validates modified fields.
 * 
 * @param {Request} req - Express request object with store ID parameter and update data in body
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function update(req, res, next) {
  const timer = storeOperationDuration.startTimer({ operation: 'update' });
  
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!id || isNaN(parseInt(id))) {
      throw new ApiError(400, 'Valid store ID is required');
    }
    
    // Validate update fields if provided
    if (updateData.name !== undefined && (updateData.name.length < 3 || updateData.name.length > 100)) {
      throw new ApiError(400, 'Store name must be between 3-100 characters');
    }
    
    if (updateData.address !== undefined && (updateData.address.length < 5 || updateData.address.length > 200)) {
      throw new ApiError(400, 'Store address must be between 5-200 characters');
    }
    
    if (updateData.city !== undefined && (updateData.city.length < 2 || updateData.city.length > 50)) {
      throw new ApiError(400, 'Store city must be between 2-50 characters');
    }
    
    if (updateData.email !== undefined && updateData.email && !isValidEmail(updateData.email)) {
      throw new ApiError(400, 'Invalid email format');
    }
    
    const store = await StoreService.updateStore(parseInt(id), updateData);
    
    if (!store) {
      storeOperationCounter.inc({ operation: 'update', status: 'not_found' });
      throw new ApiError(404, 'Store not found');
    }
    
    storeOperationCounter.inc({ operation: 'update', status: 'success' });
    res.json({
      success: true,
      message: 'Store updated successfully',
      data: store
    });
  } catch (error) {
    storeOperationCounter.inc({ operation: 'update', status: 'error' });
    next(error);
  } finally {
    timer();
  }
}

/**
 * Remove Store Controller
 * 
 * Deletes a store by ID after validating dependencies.
 * Ensures data integrity by checking for related records.
 * 
 * @param {Request} req - Express request object with store ID parameter
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function remove(req, res, next) {
  const timer = storeOperationDuration.startTimer({ operation: 'delete' });
  
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      throw new ApiError(400, 'Valid store ID is required');
    }
    
    const result = await StoreService.deleteStore(parseInt(id));
    
    if (!result) {
      storeOperationCounter.inc({ operation: 'delete', status: 'not_found' });
      throw new ApiError(404, 'Store not found');
    }
    
    storeOperationCounter.inc({ operation: 'delete', status: 'success' });
    res.json({
      success: true,
      message: 'Store deleted successfully'
    });
  } catch (error) {
    storeOperationCounter.inc({ operation: 'delete', status: 'error' });
    next(error);
  } finally {
    timer();
  }
}

/**
 * Get Store Statistics Controller
 * 
 * Retrieves operational statistics for a specific store.
 * Provides insights into store performance and activity.
 * 
 * @param {Request} req - Express request object with store ID parameter
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function getStats(req, res, next) {
  const timer = storeOperationDuration.startTimer({ operation: 'stats' });
  
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      throw new ApiError(400, 'Valid store ID is required');
    }
    
    const stats = await StoreService.getStoreStats(parseInt(id));
    
    if (!stats) {
      storeOperationCounter.inc({ operation: 'stats', status: 'not_found' });
      throw new ApiError(404, 'Store not found');
    }
    
    storeOperationCounter.inc({ operation: 'stats', status: 'success' });
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    storeOperationCounter.inc({ operation: 'stats', status: 'error' });
    next(error);
  } finally {
    timer();
  }
}

/**
 * Email validation helper function
 * 
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if email format is valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default {
  list,
  get,
  create,
  update,
  remove,
  getStats
};
