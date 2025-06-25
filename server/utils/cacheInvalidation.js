import { deleteCachePattern } from '../services/redis.service.js';

/**
 * Cache invalidation helper for different entity types
 */
const invalidateCache = {  products: async () => {
    await deleteCachePattern('api:/api/v1/products*');
    await deleteCachePattern('api:/api/v1/stock*');
  },
  
  stores: async () => {
    await deleteCachePattern('api:/api/v1/stores*');
    await deleteCachePattern('api:/api/v1/stock*');
  },
    stock: async () => {
    await deleteCachePattern('api:/api/v1/stock*');
    await deleteCachePattern('api:/api/v1/products*');
    await deleteCachePattern('api:/api/v1/stores*');
  },
    sales: async () => {
    await deleteCachePattern('api:/api/v1/sales*');
    await deleteCachePattern('api:/api/v1/stock*');
  }
};

export default invalidateCache; 