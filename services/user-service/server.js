/**
 * User Service Main Server
 * 
 * This microservice handles all user-related operations including:
 * - User authentication and authorization
 * - User profile management (CRUD operations)
 * - JWT token generation and validation
 * - Role-based access control (client vs manager roles)
 * - Password management and security
 * 
 * Architecture:
 * - Express.js REST API server
 * - PostgreSQL database using Prisma ORM (shared database approach)
 * - bcrypt for password hashing
 * - JWT for authentication tokens
 * - Prometheus metrics collection for monitoring
 * - Health check endpoints for service discovery
 * 
 * API Endpoints:
 * - POST /auth/login - User authentication
 * - POST /auth/register - User registration
 * - POST /auth/refresh - Token refresh
 * - GET /users/profile - Get user profile (authenticated)
 * - PUT /users/profile - Update user profile (authenticated)
 * - GET /users - List users (admin only)
 * - GET /health - Service health check
 * - GET /metrics - Prometheus metrics endpoint
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import os from 'os';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';

// Initialize Express app and database connection
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3002; // Default port 3002 for user service
const SERVICE_NAME = 'user-service';

// Log service startup information
console.log(`Starting ${SERVICE_NAME} on pod: ${os.hostname()}`);
console.log(`Service will listen on port: ${PORT}`);

// Security middleware - protects against common vulnerabilities
app.use(helmet());

// CORS configuration - allows cross-origin requests from API Gateway and clients
app.use(cors({
  exposedHeaders: ['Authorization', 'X-Service-Name']
}));

// Request parsing and logging middleware
app.use(express.json());
app.use(morgan('combined')); // HTTP request logging

// Metrics collection middleware for monitoring
app.use(metricsMiddleware);
metricsEndpoint(app);

// Add service identifier header to all responses for debugging/monitoring
app.use((req, res, next) => {
  res.setHeader('X-Service-Name', SERVICE_NAME);
  res.setHeader('X-Pod-Name', os.hostname());
  next();
});

// Root endpoint - service information
app.get('/', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: '1.0.0',
    description: 'User management and authentication microservice',
    pod: os.hostname(),
    status: 'running',
    endpoints: {
      authentication: '/auth',
      users: '/users',
      health: '/health',
      metrics: '/metrics'
    }
  });
});

// Authentication routes - login, register, token refresh
app.use('/auth', authRoutes);

// User management routes - profile, user listing
app.use('/users', userRoutes);

// Health check endpoint - used by load balancers and service discovery
app.get('/health', async (req, res) => {
  try {
    // Test database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'healthy',
      service: SERVICE_NAME,
      timestamp: new Date().toISOString(),
      pod: os.hostname(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: SERVICE_NAME,
      timestamp: new Date().toISOString(),
      pod: os.hostname(),
      database: 'disconnected',
      environment: process.env.NODE_ENV || 'development',
      error: error.message
    });
  }
});

// Detailed health check endpoint with service-specific checks
app.get('/health/detailed', async (req, res) => {
  const healthChecks = {
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    pod: os.hostname(),
    checks: {}
  };

  try {
    // Database connectivity check
    await prisma.$queryRaw`SELECT 1`;
    healthChecks.checks.database = { status: 'healthy', message: 'Database connection successful' };
  } catch (error) {
    healthChecks.checks.database = { status: 'unhealthy', message: error.message };
  }

  try {
    // Check if we can query users (service-specific functionality)
    const userCount = await prisma.user.count();
    healthChecks.checks.userService = { 
      status: 'healthy', 
      message: `User service operational, ${userCount} users registered` 
    };
  } catch (error) {
    healthChecks.checks.userService = { status: 'unhealthy', message: error.message };
  }

  // JWT configuration check
  const jwtSecret = process.env.JWT_SECRET;
  healthChecks.checks.jwtConfig = {
    status: jwtSecret ? 'healthy' : 'warning',
    message: jwtSecret ? 'JWT secret configured' : 'JWT secret not configured - using default'
  };

  // Memory usage check
  const memUsage = process.memoryUsage();
  healthChecks.checks.memory = {
    status: memUsage.heapUsed < 500 * 1024 * 1024 ? 'healthy' : 'warning', // 500MB threshold
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
  };

  // Overall health status
  const allHealthy = Object.values(healthChecks.checks).every(check => check.status === 'healthy');
  const hasWarnings = Object.values(healthChecks.checks).some(check => check.status === 'warning');
  
  if (allHealthy) {
    healthChecks.status = 'healthy';
  } else if (hasWarnings) {
    healthChecks.status = 'warning';
  } else {
    healthChecks.status = 'unhealthy';
  }

  res.status(allHealthy || hasWarnings ? 200 : 503).json(healthChecks);
});

// Error handling middleware - must be last
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} running on port ${PORT} (pod: ${os.hostname()})`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`Metrics available at http://localhost:${PORT}/metrics`);
});

// Export for testing purposes
export { app, server, prisma };
