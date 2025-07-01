/**
 * Product Controller for Product Microservice
 * 
 * This controller handles HTTP requests for product-related operations and acts as
 * the interface between the HTTP layer and the business logic layer (services).
 * 
 * Responsibilities:
 * - Parse and validate HTTP requests
 * - Call appropriate service methods for business logic
 * - Format responses according to API specifications
 * - Handle errors and convert them to appropriate HTTP responses
 * - Trigger cache invalidation when necessary
 * - Record metrics for monitoring and observability
 * 
 * Each controller method follows a consistent pattern:
 * 1. Extract and validate request parameters
 * 2. Call the corresponding service method
 * 3. Record metrics for the operation
 * 4. Return formatted response or pass errors to error handler
 */

import * as service from '../services/product.service.js';
import { recordError, deleteMultipleFromCache, logger } from '../../shared/index.js';

/**
 * List Products Controller
 * 
 * Handles GET /products requests with optional pagination, sorting, and filtering
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - size: Items per page (default: 10, max: 100)
 * - sort: Sort criteria (+name, -price, etc.)
 * - search: Search term for product names/descriptions
 * - minPrice, maxPrice: Price range filters
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object  
 * @param {Function} next - Express next middleware function
 */
export async function list(req, res, next) {
  try {
    // Extract query parameters with defaults
    const {
      page = 1,
      size = 10,
      sort,
      search,
      minPrice,
      maxPrice
    } = req.query;

    // Prepare filter options
    const options = {
      page: parseInt(page),
      size: parseInt(size),
      sort,
      search,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined
    };

    // Call service to get products
    const result = await service.list(options);

    // Format response with pagination metadata
    res.json({
      success: true,
      data: result.products,
      pagination: {
        page: result.page,
        size: result.size,
        total: result.total,
        pages: result.pages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev
      },
      filters: {
        search,
        minPrice,
        maxPrice,
        sort
      },
      service: 'product-service'
    });

  } catch (error) {
    recordError('list_products', req.path);
    next(error);
  }
}

/**
 * Get Product Controller
 * 
 * Handles GET /products/:id requests to retrieve a specific product
 * 
 * @param {Request} req - Express request object with product ID in params
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function get(req, res, next) {
  try {
    const productId = parseInt(req.params.id);
    
    // Call service to get product details
    const product = await service.get(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: `Product with ID ${productId} does not exist`,
        service: 'product-service'
      });
    }

    // Return product details
    res.json({
      success: true,
      data: product,
      service: 'product-service'
    });

  } catch (error) {
    recordError('get_product', req.path);
    next(error);
  }
}

/**
 * Create Product Controller
 * 
 * Handles POST /products requests to create a new product
 * 
 * @param {Request} req - Express request object with product data in body
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function create(req, res, next) {
  try {
    const productData = req.body;
    
    // Call service to create product
    const product = await service.create(productData);
    
    // Invalidate relevant caches
    await deleteMultipleFromCache(['products', 'product-catalog']);
    
    // Return created product with 201 status
    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully',
      service: 'product-service'
    });

  } catch (error) {
    recordError('create_product', req.path);
    next(error);
  }
}

/**
 * Update Product Controller
 * 
 * Handles PUT /products/:id requests to update an existing product
 * 
 * @param {Request} req - Express request object with product ID and update data
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function update(req, res, next) {
  try {
    const productId = parseInt(req.params.id);
    const updateData = req.body;
    
    // Call service to update product
    const product = await service.update(productId, updateData);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: `Product with ID ${productId} does not exist`,
        service: 'product-service'
      });
    }
    
    // Invalidate relevant caches
    await deleteMultipleFromCache(['products', 'product-catalog', `product-${productId}`]);
    
    // Return updated product
    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully',
      service: 'product-service'
    });

  } catch (error) {
    recordError('update_product', req.path);
    next(error);
  }
}

/**
 * Remove Product Controller
 * 
 * Handles DELETE /products/:id requests to delete a product
 * 
 * @param {Request} req - Express request object with product ID in params
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function remove(req, res, next) {
  try {
    const productId = parseInt(req.params.id);
    
    // Call service to delete product
    const success = await service.remove(productId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: `Product with ID ${productId} does not exist`,
        service: 'product-service'
      });
    }
    
    // Invalidate relevant caches
    await deleteMultipleFromCache(['products', 'product-catalog', `product-${productId}`]);
    
    // Return success with 204 No Content
    res.status(204).send();

  } catch (error) {
    // Handle foreign key constraint errors (product still referenced)
    if (error.code === 'P2003' || error.code === 'P2014') {
      recordError('delete_product_conflict', req.path);
      return res.status(409).json({
        success: false,
        error: 'Cannot delete product',
        message: 'Product cannot be deleted because it is referenced in stock or sales records',
        code: 'PRODUCT_REFERENCED',
        service: 'product-service'
      });
    }
    
    recordError('delete_product', req.path);
    next(error);
  }
}

/**
 * Get Product Availability Controller
 * 
 * Handles GET /products/:id/availability to get stock levels across all stores
 * 
 * @param {Request} req - Express request object with product ID in params
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function getAvailability(req, res, next) {
  try {
    const productId = parseInt(req.params.id);
    
    // Call service to get availability information
    const availability = await service.getAvailability(productId);
    
    if (!availability) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: `Product with ID ${productId} does not exist`,
        service: 'product-service'
      });
    }
    
    // Return availability information
    res.json({
      success: true,
      data: availability,
      service: 'product-service'
    });

  } catch (error) {
    recordError('get_availability', req.path);
    next(error);
  }
}

/**
 * Search Products Controller
 * 
 * Handles GET /products/search for advanced product search functionality
 * 
 * @param {Request} req - Express request object with search parameters
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function search(req, res, next) {
  try {
    const {
      q: query,
      category,
      minPrice,
      maxPrice,
      inStock,
      page = 1,
      size = 10
    } = req.query;

    // Prepare search criteria
    const searchCriteria = {
      query,
      category,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      inStock: inStock === 'true',
      page: parseInt(page),
      size: parseInt(size)
    };

    // Call service to perform search
    const result = await service.search(searchCriteria);

    // Return search results
    res.json({
      success: true,
      data: result.products,
      pagination: {
        page: result.page,
        size: result.size,
        total: result.total,
        pages: result.pages
      },
      searchCriteria: {
        query,
        category,
        minPrice,
        maxPrice,
        inStock
      },
      service: 'product-service'
    });

  } catch (error) {
    recordError('search_products', req.path);
    next(error);
  }
}

/**
 * Cache Invalidation Controller
 * 
 * Handles POST /internal/cache/invalidate requests from other services
 * to invalidate product cache when underlying data changes.
 * 
 * @param {Request} req - Express request object with keys to invalidate
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function invalidateCache(req, res, next) {
  try {
    const { keys, reason = 'Cache invalidation requested' } = req.body;

    logger.info('Cache invalidation requested', {
      keys,
      reason,
      requestedBy: req.headers['x-internal-service'] || 'unknown'
    });

    // Delete the specified cache keys
    const deletedCount = await deleteMultipleFromCache(keys);

    logger.info('Cache invalidation completed', {
      keys,
      deletedCount,
      reason
    });

    res.json({
      success: true,
      message: 'Cache invalidated successfully',
      deletedKeys: deletedCount,
      keys,
      reason,
      service: 'product-service'
    });

  } catch (error) {
    logger.error('Cache invalidation failed', {
      error: error.message,
      keys: req.body?.keys
    });
    recordError('invalidate_cache', req.path);
    next(error);
  }
}
