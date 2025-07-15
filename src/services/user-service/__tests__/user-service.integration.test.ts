import request from 'supertest';
import express from 'express';
import { UserController } from '../infrastructure/http/user.controller';

// Mock the shared modules
jest.mock('@shared/infrastructure/logging', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }))
}));

jest.mock('@shared/infrastructure/caching', () => ({
  CacheService: jest.fn(),
  createCacheMiddleware: jest.fn(() => (req: any, res: any, next: any) => next())
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }
  }))
}));

describe('User Service Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    const userController = new UserController();
    app.use('/api/users', userController.router);
  });

  describe('GET /api/users', () => {
    it('should return empty array when no users exist', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: []
      });
    });
  });

  describe('Health check', () => {
    it('should respond to basic requests', async () => {
      // This is a basic test to ensure the service is responding
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });
  });
});
