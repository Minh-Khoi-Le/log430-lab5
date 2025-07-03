import 'module-alias/register';
import express from 'express';
import { json } from 'body-parser';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { UserController } from './infrastructure/http/user.controller';
import { AuthController } from './infrastructure/http/auth.controller';
import { authenticate } from './infrastructure/middleware/auth.middleware';
import { createLogger } from '@shared/infrastructure/logging';
import { requestLogger } from '@shared/infrastructure/http';
import { redisClient, CacheService, createCacheMiddleware } from '@shared/infrastructure/caching';

// Create a logger for the user service
const logger = createLogger('user-service');

const app = express();
const PORT = process.env['PORT'] ?? 3000;
const prisma = new PrismaClient();

// Initialize Redis and Cache Service
const initializeCache = async () => {
  try {
    await redisClient.connect();
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.error('Failed to connect to Redis', error as Error);
    logger.warn('Service will operate without caching');
  }
};

// Call the initialization function
initializeCache().catch(err => logger.error('Redis initialization error', err as Error));

// Create cache service with proper service name
const cacheService = new CacheService(redisClient, 'user-service');

// Create cache middleware with TTL of 10 minutes for user data
// Users data doesn't change frequently, so we can use a longer TTL
const userCache = createCacheMiddleware({ 
  cacheService, 
  ttl: 600 // 10 minutes
});

// Middleware
app.use(cors());
app.use(json());
app.use(requestLogger); // Add request logging middleware
app.use(userCache); // Add cache middleware

// Health check
app.get('/health', (req, res) => {
  logger.info('Health check requested');
  res.json({ status: 'ok', service: 'user-service' });
});

// Routes
const userController = new UserController(cacheService);
const authController = new AuthController(prisma);

// Authentication routes under /api/users to match frontend expectations
app.post('/api/users/login', (req, res) => {
  logger.info('Login attempt', { username: req.body.name });
  authController.login(req, res);
});

app.post('/api/users/register', (req, res) => {
  logger.info('Registration attempt', { username: req.body.name });
  authController.register(req, res);
});

app.get('/api/users/me', authenticate, userCache, (req, res) => {
  logger.info('User profile requested', { userId: (req as any).user?.id });
  authController.me(req, res);
});

// User management routes
app.use('/api/users', userController.router);

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Request error', err, {
    path: req.path,
    method: req.method,
  });
  
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`User service started successfully`, {
    port: PORT,
    environment: process.env['NODE_ENV'] ?? 'development'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  await redisClient.disconnect().catch(err => logger.error('Error disconnecting Redis', err as Error));
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  await redisClient.disconnect().catch(err => logger.error('Error disconnecting Redis', err as Error));
  process.exit(0);
});