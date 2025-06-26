/**
 * Product Service Main Server - Simplified version without Prisma queries
 */

import express from 'express';
import os from 'os';

// Import shared components
import {
  initializeSharedServices,
  cleanupSharedServices,
  config,
  logger,
  errorHandler,
  notFoundHandler
} from '@log430/shared';

// Initialize Express app
const app = express();

// Parse JSON bodies
app.use(express.json());

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

    // Root endpoint - service information
    app.get('/', (req, res) => {
      res.json({
        service: serviceName,
        version: '1.0.0',
        description: 'Product management microservice (simplified)',
        pod: os.hostname(),
        status: 'running'
      });
    });

    // Simple product API
    app.get('/products', (req, res) => {
      res.json({
        success: true,
        data: [
          { id: 1, name: 'Sample Product 1', price: 19.99 },
          { id: 2, name: 'Sample Product 2', price: 29.99 },
          { id: 3, name: 'Sample Product 3', price: 39.99 }
        ],
        message: 'Products retrieved successfully',
        service: serviceName
      });
    });

    app.get('/products/:id', (req, res) => {
      const productId = parseInt(req.params.id);
      if (productId < 1 || productId > 3) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
          message: `Product with ID ${productId} does not exist`,
          service: serviceName
        });
      }
      
      const products = [
        { id: 1, name: 'Sample Product 1', price: 19.99, description: 'This is a sample product' },
        { id: 2, name: 'Sample Product 2', price: 29.99, description: 'Another sample product' },
        { id: 3, name: 'Sample Product 3', price: 39.99, description: 'Yet another sample product' }
      ];
      
      res.json({
        success: true,
        data: products[productId - 1],
        message: 'Product retrieved successfully',
        service: serviceName
      });
    });

    // Health check endpoint - used by load balancers and service discovery
    app.get('/health', async (req, res) => {
      res.status(200).json({
        status: 'healthy',
        service: serviceName,
        timestamp: new Date().toISOString(),
        pod: os.hostname(),
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime()
      });
    });

    // 404 handler for unmatched routes
    app.use(notFoundHandler);

    // Error handling middleware - must be last
    app.use(errorHandler);

    // Start the server
    const server = app.listen(port, () => {
      logger.info(`${serviceName} running on port ${port} (pod: ${os.hostname()})`);
      logger.info(`Health check available at http://localhost:${port}/health`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}, initiating graceful shutdown`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
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
    return { app, server };

  } catch (error) {
    logger.error('Failed to initialize service', { error: error.message });
    process.exit(1);
  }
}

// Initialize the application
initializeApp();
