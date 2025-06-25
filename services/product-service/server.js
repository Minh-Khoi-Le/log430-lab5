/**
 * Product Service Main Server
 * 
 * This microservice handles all product-related operations including:
 * - Product catalog management (CRUD operations)
 * - Product information queries
 * - Product price management
 * - Product search and filtering capabilities
 * 
 * Architecture:
 * - Express.js REST API server
 * - PostgreSQL database using Prisma ORM (shared database approach)
 * - Redis caching for frequently accessed product data
 * - Prometheus metrics collection for monitoring
 * - Health check endpoints for service discovery
 * 
 * API Endpoints:
 * - GET /products - List all products with pagination and sorting
 * - GET /products/:id - Get specific product details
 * - POST /products - Create new product (admin only)
 * - PUT /products/:id - Update product information (admin only)
 * - DELETE /products/:id - Delete product (admin only)
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
import productRoutes from './routes/product.routes.js';

// Initialize Express app and database connection
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001; // Default port 3001 for product service
const SERVICE_NAME = 'product-service';

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
    description: 'Product management microservice',
    pod: os.hostname(),
    status: 'running'
  });
});

// Product API routes - all product-related endpoints
app.use('/products', productRoutes);

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
    // Check if we can query products (service-specific functionality)
    const productCount = await prisma.product.count();
    healthChecks.checks.productService = { 
      status: 'healthy', 
      message: `Product service operational, ${productCount} products in catalog` 
    };
  } catch (error) {
    healthChecks.checks.productService = { status: 'unhealthy', message: error.message };
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
