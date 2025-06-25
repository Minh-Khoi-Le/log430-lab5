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
import { PrismaClient } from '@prisma/client';
import os from 'os';

// Import shared components
import {
  initializeSharedServices,
  cleanupSharedServices,
  config,
  logger,
  errorHandler,
  notFoundHandler,
  httpMetricsMiddleware,
  metricsHandler
} from '@log430/shared';

// Import routes
import productRoutes from './routes/product.routes.js';

// Initialize Express app and database connection
const app = express();
const prisma = new PrismaClient();

async function initializeApp() {
  try {
    // Initialize all shared services first
    await initializeSharedServices();
    
    // Get service configuration
    const serviceName = config.get('service.name', 'product-service');
    const port = config.get('service.port', 3001);
    
    logger.info(`Starting ${serviceName} on pod: ${os.hostname()}`);
    logger.info(`Service will listen on port: ${port}`);

    // Add service identifier header to all responses for debugging/monitoring
    app.use((req, res, next) => {
      res.setHeader('X-Service-Name', serviceName);
      res.setHeader('X-Pod-Name', os.hostname());
      next();
    });

    // Metrics collection middleware for monitoring
    app.use(httpMetricsMiddleware);
    
    // Metrics endpoint
    app.get('/metrics', metricsHandler);

    // Root endpoint - service information
    app.get('/', (req, res) => {
      res.json({
        service: serviceName,
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
          service: serviceName,
          timestamp: new Date().toISOString(),
          pod: os.hostname(),
          database: 'connected',
          environment: process.env.NODE_ENV || 'development',
          uptime: process.uptime()
        });
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'unhealthy',
          service: serviceName,
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
        service: serviceName,
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

    // 404 handler for unmatched routes
    app.use(notFoundHandler);

    // Error handling middleware - must be last
    app.use(errorHandler);

    // Start the server
    const server = app.listen(port, () => {
      logger.info(`${serviceName} running on port ${port} (pod: ${os.hostname()})`);
      logger.info(`Health check available at http://localhost:${port}/health`);
      logger.info(`Metrics available at http://localhost:${port}/metrics`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}, initiating graceful shutdown`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await prisma.$disconnect();
          await cleanupSharedServices();
          logger.info('Shared services cleaned up');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error: error.message });
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Export for testing purposes
    return { app, server, prisma };

  } catch (error) {
    logger.error('Failed to initialize service', { error: error.message });
    process.exit(1);
  }
}

// Initialize the application
initializeApp();
