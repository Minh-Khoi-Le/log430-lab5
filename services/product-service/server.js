/**
 * Product Service Main Server - Database-backed implementation with Prisma
 */

import express from 'express';
import os from 'os';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

// Import shared components
import {
  initializeSharedServices,
  cleanupSharedServices,
  config,
  logger,
  errorHandler,
  notFoundHandler,
  httpMetricsMiddleware,
  checkDatabaseHealth
} from '../shared/index.js';

// Import routes
import productRoutes from './routes/product.routes.js';

// Initialize Express app
const app = express();

// Security and performance middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));

// Parse JSON bodies
app.use(express.json());

// Metrics middleware
app.use(httpMetricsMiddleware);

async function initializeApp() {
  try {
    // Get service configuration
    const serviceName = config.get('service.name', 'product-service');
    const port = config.get('service.port', 3001);
    
    // Initialize all shared services including database
    await initializeSharedServices({
      serviceName,
      enableDatabase: true,
      enableDatabaseLogging: process.env.NODE_ENV === 'development'
    });
    
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
        description: 'Product management microservice with database persistence',
        pod: os.hostname(),
        status: 'running'
      });
    });

    // Mount product routes
    app.use('/products', productRoutes);
    app.use('/api/products', productRoutes);

    // Health check endpoint - used by load balancers and service discovery
    app.get('/health', async (req, res) => {
      const dbHealth = await checkDatabaseHealth(serviceName);
      
      res.status(dbHealth.healthy ? 200 : 503).json({
        status: dbHealth.healthy ? 'healthy' : 'unhealthy',
        service: serviceName,
        timestamp: new Date().toISOString(),
        pod: os.hostname(),
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        database: dbHealth
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
          await cleanupSharedServices({ serviceName });
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
