/**
 * Store Service Main Server
 * 
 * This microservice handles all store-related operations including:
 * - Store information management (CRUD operations)
 * - Store location and address data
 * - Store operational status and configurations
 * - Store performance metrics and analytics
 * - Integration with stock and sales services
 * 
 * Architecture:
 * - Express.js REST API server
 * - PostgreSQL database using Prisma ORM (shared database approach)
 * - Redis caching for frequently accessed store data
 * - Prometheus metrics collection for monitoring
 * - Health check endpoints for service discovery
 * 
 * API Endpoints:
 * - GET /stores - List all stores with pagination and filtering
 * - GET /stores/:id - Get specific store details
 * - POST /stores - Create new store (admin only)
 * - PUT /stores/:id - Update store information (admin only)
 * - DELETE /stores/:id - Delete store (admin only)
 * - GET /stores/:id/inventory - Get store inventory summary
 * - GET /stores/:id/sales - Get store sales summary
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
import storeRoutes from './routes/store.routes.js';

// Initialize Express app and database connection
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3003; // Default port 3003 for store service
const SERVICE_NAME = 'store-service';

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
    description: 'Store management microservice',
    pod: os.hostname(),
    status: 'running',
    endpoints: {
      stores: '/stores',
      health: '/health',
      metrics: '/metrics'
    }
  });
});

// Store management routes - all store-related endpoints
app.use('/stores', storeRoutes);

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
    // Check if we can query stores (service-specific functionality)
    const storeCount = await prisma.store.count();
    healthChecks.checks.storeService = { 
      status: 'healthy', 
      message: `Store service operational, ${storeCount} stores configured` 
    };
  } catch (error) {
    healthChecks.checks.storeService = { status: 'unhealthy', message: error.message };
  }

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
