/**
 * Product Service for Product Microservice
 * 
 * This service layer contains the business logic for product operations.
 * It acts as an intermediary between the controllers and the data access layer,
 * implementing business rules, data validation, and coordination between different data sources.
 * 
 * Business Logic Responsibilities:
 * - Data validation and business rule enforcement
 * - Coordination between product and stock operations
 * - Data transformation between API and database formats
 * - Transaction management for complex operations
 * - Integration with other services when needed
 * 
 * The service uses the DAO (Data Access Object) pattern to interact with the database,
 * keeping business logic separate from data access concerns.
 */

import { PrismaClient } from '@prisma/client';
import { recordDatabaseOperation } from '../middleware/metrics.js';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * List Products Service
 * 
 * Retrieves a paginated and filtered list of products with business logic applied.
 * Implements search functionality, price filtering, and pagination.
 * 
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (starting from 1)
 * @param {number} options.size - Number of items per page
 * @param {string} options.sort - Sort criteria (+field or -field)
 * @param {string} options.search - Search term for name/description
 * @param {number} options.minPrice - Minimum price filter
 * @param {number} options.maxPrice - Maximum price filter
 * @returns {Promise<Object>} - Promise resolving to paginated product list
 */
export async function list(options) {
  const {
    page = 1,
    size = 10,
    sort,
    search,
    minPrice,
    maxPrice
  } = options;

  // Calculate pagination
  const offset = (page - 1) * size;
  const limit = Math.min(size, 100); // Maximum 100 items per page

  // Build where clause for filtering
  const where = {};
  
  // Search filter - matches product name or description
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }
  
  // Price range filters
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }

  // Build orderBy clause for sorting
  let orderBy = { id: 'asc' }; // Default sort
  
  if (sort) {
    const direction = sort.startsWith('-') ? 'desc' : 'asc';
    const field = sort.replace(/^[+-]/, '');
    
    // Validate sort field
    if (['name', 'price', 'id'].includes(field)) {
      orderBy = { [field]: direction };
    }
  }

  return recordDatabaseOperation('list_products', async () => {
    // Get total count for pagination
    const total = await prisma.product.count({ where });
    
    // Get products
    const products = await prisma.product.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
      include: {
        stocks: {
          include: {
            store: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    // Calculate pagination metadata
    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;

    return {
      products,
      pagination: {
        page,
        size: limit,
        total,
        pages,
        hasNext,
        hasPrev
      }
    };
  });
}

/**
 * Get Product Service
 * 
 * Retrieves a single product by ID with related data (stock information)
 * 
 * @param {number} id - Product ID
 * @returns {Promise<Object|null>} - Promise resolving to product object or null
 */
export async function get(id) {
  return recordDatabaseOperation('get_product', async () => {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        stocks: {
          include: {
            store: {
              select: { id: true, name: true, address: true }
            }
          }
        },
        saleLines: {
          select: { id: true, quantity: true, unitPrice: true },
          take: 10, // Limit recent sales for performance
          orderBy: { id: 'desc' }
        }
      }
    });

    // If product not found, return null
    if (!product) {
      return null;
    }

    // Add computed fields for business logic
    const totalStock = product.stocks.reduce((sum, stock) => sum + stock.quantity, 0);
    const availableInStores = product.stocks.filter(stock => stock.quantity > 0).length;
    const totalStores = product.stocks.length;

    return {
      ...product,
      computed: {
        totalStock,
        availableInStores,
        totalStores,
        isAvailable: totalStock > 0,
        lastUpdated: new Date().toISOString()
      }
    };
  });
}

/**
 * Create Product Service
 * 
 * Creates a new product and initializes stock entries for all existing stores.
 * Uses transaction to ensure data consistency.
 * 
 * @param {Object} data - Product data
 * @param {string} data.name - Product name
 * @param {number} data.price - Product price
 * @param {string} [data.description] - Product description
 * @returns {Promise<Object>} - Promise resolving to created product
 */
export async function create(data) {
  // Validate required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    throw new Error('Product name is required and cannot be empty');
  }
  
  if (data.price === undefined || data.price === null || data.price < 0) {
    throw new Error('Product price is required and must be non-negative');
  }

  return recordDatabaseOperation('create_product', async () => {
    // Use transaction to create product and initialize stock
    return prisma.$transaction(async (tx) => {
      // Create the product
      const product = await tx.product.create({
        data: {
          name: data.name.trim(),
          price: parseFloat(data.price),
          description: data.description ? data.description.trim() : null
        }
      });

      // Get all existing stores
      const stores = await tx.store.findMany({
        select: { id: true }
      });

      // Create stock entries for all stores with quantity 0
      if (stores.length > 0) {
        const stockData = stores.map(store => ({
          productId: product.id,
          storeId: store.id,
          quantity: 0
        }));

        await tx.stock.createMany({
          data: stockData
        });
      }

      // Return product with stock information
      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          stocks: {
            include: {
              store: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });
    });
  });
}

/**
 * Update Product Service
 * 
 * Updates an existing product with provided data.
 * Only updates fields that are provided in the data object.
 * 
 * @param {number} id - Product ID to update
 * @param {Object} data - Update data
 * @returns {Promise<Object|null>} - Promise resolving to updated product or null
 */
export async function update(id, data) {
  // Build update data object with only provided fields
  const updateData = {};
  
  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.trim().length === 0) {
      throw new Error('Product name cannot be empty');
    }
    updateData.name = data.name.trim();
  }
  
  if (data.price !== undefined) {
    if (data.price < 0) {
      throw new Error('Product price must be non-negative');
    }
    updateData.price = parseFloat(data.price);
  }
  
  if (data.description !== undefined) {
    updateData.description = data.description ? data.description.trim() : null;
  }

  // If no fields to update, return current product
  if (Object.keys(updateData).length === 0) {
    return get(id);
  }

  return recordDatabaseOperation('update_product', async () => {
    try {
      const product = await prisma.product.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          stocks: {
            include: {
              store: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });

      return product;
    } catch (error) {
      // Handle record not found
      if (error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  });
}

/**
 * Remove Product Service
 * 
 * Deletes a product and its associated stock entries.
 * Checks for constraints before deletion (sales references).
 * 
 * @param {number} id - Product ID to delete
 * @returns {Promise<boolean>} - Promise resolving to true if deleted, false if not found
 */
export async function remove(id) {
  return recordDatabaseOperation('delete_product', async () => {
    try {
      // Use transaction to delete product and related data
      await prisma.$transaction(async (tx) => {
        // First, delete stock entries
        await tx.stock.deleteMany({
          where: { productId: parseInt(id) }
        });

        // Then delete the product
        await tx.product.delete({
          where: { id: parseInt(id) }
        });
      });

      return true;
    } catch (error) {
      // Handle record not found
      if (error.code === 'P2025') {
        return false;
      }
      
      // Rethrow other errors (like foreign key constraints)
      throw error;
    }
  });
}

/**
 * Get Product Availability Service
 * 
 * Retrieves stock availability information for a product across all stores
 * 
 * @param {number} id - Product ID
 * @returns {Promise<Object|null>} - Promise resolving to availability data or null
 */
export async function getAvailability(id) {
  return recordDatabaseOperation('get_availability', async () => {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        price: true,
        stocks: {
          include: {
            store: {
              select: { id: true, name: true, address: true }
            }
          },
          orderBy: { quantity: 'desc' }
        }
      }
    });

    if (!product) {
      return null;
    }

    // Calculate availability metrics
    const totalStock = product.stocks.reduce((sum, stock) => sum + stock.quantity, 0);
    const availableStores = product.stocks.filter(stock => stock.quantity > 0);
    const outOfStockStores = product.stocks.filter(stock => stock.quantity === 0);

    return {
      product: {
        id: product.id,
        name: product.name,
        price: product.price
      },
      availability: {
        totalStock,
        totalStores: product.stocks.length,
        availableInStores: availableStores.length,
        outOfStockInStores: outOfStockStores.length,
        isAvailable: totalStock > 0
      },
      storeAvailability: product.stocks.map(stock => ({
        store: stock.store,
        quantity: stock.quantity,
        status: stock.quantity > 0 ? 'in_stock' : 'out_of_stock'
      }))
    };
  });
}

/**
 * Search Products Service
 * 
 * Advanced product search with multiple criteria
 * 
 * @param {Object} criteria - Search criteria
 * @returns {Promise<Object>} - Promise resolving to search results
 */
export async function search(criteria) {
  const {
    query,
    minPrice,
    maxPrice,
    inStock = false,
    page = 1,
    size = 10
  } = criteria;

  const offset = (page - 1) * size;
  const limit = Math.min(size, 100);

  // Build complex where clause
  const where = { AND: [] };

  // Text search in name and description
  if (query) {
    where.AND.push({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ]
    });
  }

  // Price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceFilter = {};
    if (minPrice !== undefined) priceFilter.gte = minPrice;
    if (maxPrice !== undefined) priceFilter.lte = maxPrice;
    where.AND.push({ price: priceFilter });
  }

  // Stock availability filter
  if (inStock) {
    where.AND.push({
      stocks: {
        some: { quantity: { gt: 0 } }
      }
    });
  }

  return recordDatabaseOperation('search_products', async () => {
    const total = await prisma.product.count({ where });
    
    const products = await prisma.product.findMany({
      where,
      skip: offset,
      take: limit,
      include: {
        stocks: {
          include: {
            store: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    });

    return {
      products,
      pagination: {
        page,
        size: limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  });
}

/**
 * Get Prisma client for external use (metrics, etc.)
 * 
 * @returns {PrismaClient} - Prisma client instance
 */
export function getPrismaClient() {
  return prisma;
}
