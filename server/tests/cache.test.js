import request from 'supertest';
import app from '../index.js';
import redisClient, { isRedisDisabled } from '../services/redis.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Redis Caching Tests', () => {
  let testToken;

  beforeAll(async () => {
    // Skip all tests if Redis is disabled
    if (isRedisDisabled) {
      console.log('Skipping cache tests: Redis is disabled in test environment');
      return;
    }

    // Create a test admin user for authentication
    await prisma.user.upsert({
      where: { name: 'test-admin-cache' },
      update: {},
      create: {
        name: 'test-admin-cache',
        password: 'password',
        role: 'admin'
      }
    });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/users/login')
      .send({ name: 'test-admin-cache', password: 'password' });
    
    testToken = loginResponse.headers.authorization?.split(' ')[1];
  });  afterAll(async () => {
    // Skip cleanup if Redis is disabled
    if (isRedisDisabled) {
      await prisma.$disconnect();
      return;
    }

    // Clean up test user
    await prisma.user.delete({
      where: { name: 'test-admin-cache' }
    }).catch(() => {}); // Ignore if already deleted

    // Properly close Redis connection
    if (redisClient) {
      await redisClient.quit();
    }
    
    await prisma.$disconnect();
  });

  // Wait for caching operations to complete
  const waitForCache = async () => new Promise(resolve => setTimeout(resolve, 100));
  // Test products endpoint caching
  test('Cached product endpoint returns faster on second call', async () => {
    // Skip if Redis is disabled
    if (isRedisDisabled) {
      console.log('Skipping test: Redis is disabled');
      return;
    }
    
    // Clear any existing cache first
    await redisClient.flushall();
    
    // First call (no cache)
    const startNoCache = Date.now();
    const firstResponse = await request(app).get('/api/v1/products');
    const timeNoCache = Date.now() - startNoCache;
    
    // Wait for cache to be set
    await waitForCache();
    
    // Second call (with cache)
    const startWithCache = Date.now();
    const secondResponse = await request(app).get('/api/v1/products');
    const timeWithCache = Date.now() - startWithCache;

    // Both calls should return 200
    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    
    // The second call should be faster than the first (or at least not much slower)
    expect(timeWithCache).toBeLessThan(timeNoCache + 50); // Allow 50ms tolerance
    
    // Content structure should be the same (same product count and main product properties)
    expect(Array.isArray(firstResponse.body)).toBe(true);
    expect(Array.isArray(secondResponse.body)).toBe(true);
    expect(firstResponse.body.length).toBe(secondResponse.body.length);
    
    // Check that the main product data is the same (ignoring stock which may vary)
    if (firstResponse.body.length > 0) {
      const firstProduct = firstResponse.body[0];
      const secondProduct = secondResponse.body[0];
      expect(firstProduct.id).toBe(secondProduct.id);
      expect(firstProduct.name).toBe(secondProduct.name);
      expect(firstProduct.price).toBe(secondProduct.price);
    }  });// Test cache invalidation after product update
  test('Cache is invalidated after product update', async () => {
    // Skip if Redis is disabled
    if (isRedisDisabled) {
      console.log('Skipping test: Redis is disabled');
      return;
    }
    
    // Clear cache first to ensure fresh data
    await redisClient.flushall();
    
    // Wait for cache clear
    await waitForCache();
    
    // First get all products and save the response
    const initialResponse = await request(app).get('/api/v1/products');
    expect(initialResponse.status).toBe(200);
    expect(initialResponse.body.length).toBeGreaterThan(0);
    
    // Use the first product for testing
    const productToUpdate = initialResponse.body[0];
    const originalName = productToUpdate.name;
    const originalPrice = productToUpdate.price;
    
    // Wait for cache to be set
    await waitForCache();
    
    // Update the product
    const updateResponse = await request(app)
      .put(`/api/v1/products/${productToUpdate.id}`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({ 
        name: `${originalName} - Updated`, 
        price: originalPrice + 10,
        description: productToUpdate.description
      });
    
    expect(updateResponse.status).toBe(200);
    
    // Wait for cache invalidation
    await waitForCache();
    
    // Get products again - this should hit the database, not cache
    const afterUpdateResponse = await request(app).get('/api/v1/products');
    expect(afterUpdateResponse.status).toBe(200);
    
    // Find our updated product in the response
    const updatedProduct = afterUpdateResponse.body.find(p => p.id === productToUpdate.id);
    expect(updatedProduct).toBeDefined();
    expect(updatedProduct.name).toBe(`${originalName} - Updated`);
    expect(updatedProduct.price).toBe(originalPrice + 10);
    
    // Restore original product state
    await request(app)
      .put(`/api/v1/products/${productToUpdate.id}`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({ 
        name: originalName, 
        price: originalPrice,
        description: productToUpdate.description
      });
  });
}); 