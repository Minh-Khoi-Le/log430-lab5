// Set up global Jest environment
import { jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { cleanup as redisCleanup } from '../services/redis.service.js';

global.jest = jest;

// Set default timeout for all tests
jest.setTimeout(10000);

// Global teardown
afterAll(async () => {
  try {
    // Clean up Redis connections
    await redisCleanup();
    
    // Clean up Prisma connections
    const prisma = new PrismaClient();
    await prisma.$disconnect();
  } catch (error) {
    console.warn('Test cleanup error:', error.message);
  }
});


