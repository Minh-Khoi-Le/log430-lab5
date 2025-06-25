/**
 * Product Service
 * 
 * 
 * The service is responsible for:
 * - Implementing business rules and validation
 * - Coordinating data operations through the DAO
 * - Transforming data between the API and database formats if needed
 * 
 * This service is used by the product controller to perform CRUD operations
 * on product data.
 */

import dao from '../dao/product.dao.js';

/**
 * List Products Service
 * 
 * Retrieves a paginated and optionally sorted list of products.
 * 
 * @param {Object} options - Pagination and sorting options
 * @param {number} options.page - Page number (starting from 1)
 * @param {number} options.size - Number of items per page
 * @param {string} options.sort - Field to sort by
 * @returns {Promise<Array>} - Promise resolving to array of products
 */
export async function list({ page = 1, size = 10, sort }) {
  const offset = (page - 1) * size;
  return dao.findAll({ offset, limit: size, sort });
}

/**
 * Get Product Service
 * 
 * Retrieves a single product by ID.
 * 
 * @param {number|string} id - Product ID
 * @returns {Promise<Object|null>} - Promise resolving to product object or null if not found
 */
export async function get(id) {
  return dao.findById(id);
}

/**
 * Create Product Service
 * 
 * Creates a new product with the provided data.
 * Maps API field names to database field names.
 * 
 * @param {Object} data - Product data
 * @param {string} data.name - Product name
 * @param {number} data.price - Product price
 * @param {string} [data.description] - Optional product description
 * @returns {Promise<Object>} - Promise resolving to created product
 */
export async function create(data) {
  // Map API field names to database field names
  const productData = {
    name: data.name,
    price: data.price,
    description: data.description
  };
  
  // Use Prisma transaction to create product and initialize stock
  return dao.insertWithDefaultStock(productData);
}

/**
 * Update Product Service
 * 
 * Updates an existing product with the provided data.
 * Maps API field names to database field names.
 * 
 * @param {number|string} id - Product ID
 * @param {Object} data - Updated product data
 * @returns {Promise<Object|null>} - Promise resolving to updated product or null if not found
 */
export async function update(id, data) {
  // Map API field names to database field names
  const productData = {};
  
  if (data.name !== undefined) productData.name = data.name;
  if (data.price !== undefined) productData.price = data.price;
  if (data.description !== undefined) productData.description = data.description;
  
  return dao.update(id, productData);
}

/**
 * Remove Product Service
 * 
 * Deletes a product by ID.
 * 
 * @param {number|string} id - Product ID
 * @returns {Promise<boolean>} - Promise resolving to true if deleted, false if not found
 */
export async function remove(id) {
  try {
    const product = await dao.del(id);
    return !!product; // Return true if product was deleted successfully
  } catch (error) {
    // Rethrow the error to be handled by the controller
    throw error;
  }
} 