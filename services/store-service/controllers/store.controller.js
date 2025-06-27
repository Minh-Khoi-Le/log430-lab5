/**
 * Store Controller for Store Service
 * 
 * This controller manages all store-related operations in the microservices architecture.
 * It provides endpoints for CRUD operations on stores and basic store management.
 * 
 * Features:
 * - Store CRUD operations (Create, Read, Update, Delete)
 * - Store listing and details retrieval
 * - Store statistics and analytics
 * - Comprehensive error handling with shared components
 * 
 * @author Store Service Team
 * @version 2.0.0
 */

import StoreService from '../services/store.service.js';

// Import shared components
import {
  ValidationError,
  NotFoundError,
  logger,
  asyncHandler,
  recordOperation
} from '../../shared/index.js';

/**
 * List Stores Controller
 * 
 * Retrieves a paginated list of all stores with optional filtering
 */
export const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, city } = req.query;

  logger.info('Retrieving stores list', {
    page,
    limit,
    search,
    status,
    city,
    userId: req.user?.id
  });

  recordOperation('store_list', 'start');

  try {
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      status,
      city
    };

    const result = await StoreService.getAllStores(options);

    recordOperation('store_list', 'success');

    logger.info('Stores list retrieved successfully', {
      storeCount: result.stores?.length || 0,
      totalStores: result.total,
      page,
      limit
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    recordOperation('store_list', 'error');
    throw error;
  }
});

/**
 * Get Store Controller
 * 
 * Retrieves a single store by ID
 */
export const get = asyncHandler(async (req, res) => {
  const { storeId } = req.params;

  // Input validation
  if (!storeId || isNaN(storeId)) {
    throw new ValidationError('Valid store ID is required');
  }

  logger.info('Retrieving store', {
    storeId,
    userId: req.user?.id
  });

  recordOperation('store_get', 'start');

  try {
    const store = await StoreService.getStoreById(storeId, req.user);

    if (!store) {
      throw new NotFoundError('Store not found');
    }

    recordOperation('store_get', 'success');

    logger.info('Store retrieved successfully', {
      storeId: store.id,
      storeName: store.name
    });

    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    recordOperation('store_get', 'error');
    throw error;
  }
});

/**
 * Create Store Controller
 * 
 * Creates a new store
 */
export const create = asyncHandler(async (req, res) => {
  const { name, address, city, province, postalCode, phone, email, managerId } = req.body;

  // Input validation
  if (!name || name.trim().length === 0) {
    throw new ValidationError('Store name is required');
  }

  if (!address || address.trim().length === 0) {
    throw new ValidationError('Store address is required');
  }

  if (!city || city.trim().length === 0) {
    throw new ValidationError('City is required');
  }

  if (!province || province.trim().length === 0) {
    throw new ValidationError('Province is required');
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('Valid email address is required');
  }

  logger.info('Creating new store', {
    name,
    city,
    province,
    managerId,
    userId: req.user?.id
  });

  recordOperation('store_create', 'start');

  try {
    const storeData = {
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      province: province.trim(),
      postalCode: postalCode?.trim(),
      phone: phone?.trim(),
      email: email?.trim(),
      managerId: managerId ? parseInt(managerId) : null,
      createdBy: req.user?.id
    };

    const store = await StoreService.createStore(storeData, req.user);

    recordOperation('store_create', 'success');

    logger.info('Store created successfully', {
      storeId: store.id,
      storeName: store.name,
      city: store.city
    });

    res.status(201).json({
      success: true,
      message: 'Store created successfully',
      data: store
    });
  } catch (error) {
    recordOperation('store_create', 'error');
    throw error;
  }
});

/**
 * Validate store update data
 */
function validateUpdateData(data) {
  const { name, address, city, province, email, status } = data;

  if (name !== undefined && (!name || name.trim().length === 0)) {
    throw new ValidationError('Store name cannot be empty');
  }

  if (address !== undefined && (!address || address.trim().length === 0)) {
    throw new ValidationError('Store address cannot be empty');
  }

  if (city !== undefined && (!city || city.trim().length === 0)) {
    throw new ValidationError('City cannot be empty');
  }

  if (province !== undefined && (!province || province.trim().length === 0)) {
    throw new ValidationError('Province cannot be empty');
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('Valid email address is required');
  }

  if (status && !['active', 'inactive', 'closed'].includes(status)) {
    throw new ValidationError('Status must be one of: active, inactive, closed');
  }
}

/**
 * Build update data object
 */
function buildUpdateData(body, userId) {
  const { name, address, city, province, postalCode, phone, email, managerId, status } = body;

  return {
    ...(name !== undefined && { name: name.trim() }),
    ...(address !== undefined && { address: address.trim() }),
    ...(city !== undefined && { city: city.trim() }),
    ...(province !== undefined && { province: province.trim() }),
    ...(postalCode !== undefined && { postalCode: postalCode?.trim() }),
    ...(phone !== undefined && { phone: phone?.trim() }),
    ...(email !== undefined && { email: email?.trim() }),
    ...(managerId !== undefined && { managerId: managerId ? parseInt(managerId) : null }),
    ...(status !== undefined && { status }),
    updatedBy: userId
  };
}

/**
 * Update Store Controller
 * 
 * Updates an existing store
 */
export const update = asyncHandler(async (req, res) => {
  const { storeId } = req.params;

  // Input validation
  if (!storeId || isNaN(storeId)) {
    throw new ValidationError('Valid store ID is required');
  }

  validateUpdateData(req.body);

  logger.info('Updating store', {
    storeId,
    hasName: !!req.body.name,
    hasAddress: !!req.body.address,
    status: req.body.status,
    userId: req.user?.id
  });

  recordOperation('store_update', 'start');

  try {
    const updateData = buildUpdateData(req.body, req.user?.id);
    const store = await StoreService.updateStore(storeId, updateData, req.user);

    recordOperation('store_update', 'success');

    logger.info('Store updated successfully', {
      storeId: store.id,
      storeName: store.name,
      status: store.status
    });

    res.json({
      success: true,
      message: 'Store updated successfully',
      data: store
    });
  } catch (error) {
    recordOperation('store_update', 'error');
    throw error;
  }
});

/**
 * Remove Store Controller
 * 
 * Soft deletes a store (marks as inactive)
 */
export const remove = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const { force = false } = req.query;

  // Input validation
  if (!storeId || isNaN(storeId)) {
    throw new ValidationError('Valid store ID is required');
  }

  logger.info('Removing store', {
    storeId,
    force: force === 'true',
    userId: req.user?.id
  });

  recordOperation('store_remove', 'start');

  try {
    const result = await StoreService.removeStore(storeId, {
      force: force === 'true',
      removedBy: req.user?.id
    }, req.user);

    recordOperation('store_remove', 'success');

    logger.info('Store removed successfully', {
      storeId,
      force: force === 'true',
      storeName: result.storeName
    });

    res.json({
      success: true,
      message: `Store ${force === 'true' ? 'permanently deleted' : 'deactivated'} successfully`,
      data: result
    });
  } catch (error) {
    recordOperation('store_remove', 'error');
    throw error;
  }
});

/**
 * Get Store Statistics Controller
 * 
 * Retrieves statistics and analytics for stores
 */
export const getStats = asyncHandler(async (req, res) => {
  const { storeId, period, includeInactive } = req.query;

  logger.info('Retrieving store statistics', {
    storeId,
    period,
    includeInactive: includeInactive === 'true',
    userId: req.user?.id
  });

  recordOperation('store_stats', 'start');

  try {
    const options = {
      storeId: storeId ? parseInt(storeId) : undefined,
      period,
      includeInactive: includeInactive === 'true'
    };

    const stats = await StoreService.getStoreStatistics(options, req.user);

    recordOperation('store_stats', 'success');

    logger.info('Store statistics retrieved successfully', {
      storeId,
      period,
      totalStores: stats.totalStores,
      activeStores: stats.activeStores
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    recordOperation('store_stats', 'error');
    throw error;
  }
});

// Export all functions
export default {
  list,
  get,
  create,
  update,
  remove,
  getStats
};
