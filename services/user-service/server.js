/**
 * User Service Main Server
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
  notFoundHandler,
  healthCheck
} from '../shared/index.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';

// Initialize Express app
const app = express();

// Parse JSON bodies
app.use(express.json());

async function initializeApp() {
  try {
    // Initialize all shared services first
    await initializeSharedServices({
      serviceName: 'user-service',
      enableDatabase: true,
      enableDatabaseLogging: process.env.NODE_ENV === 'development'
    });
    
    // Get service configuration
    const serviceName = config.get('service.name', 'user-service');
    const port = config.get('service.port', 3002);
    
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
        version: '2.0.0',
        description: 'User authentication and management microservice',
        pod: os.hostname(),
        status: 'running'
      });
    });

    // API routes
    app.use('/auth', authRoutes);
    app.use('/users', userRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);

    // Health check endpoint - used by load balancers and service discovery
    app.get('/health', async (req, res) => {
      try {
        // Use the shared health check that includes database status
        const healthStatus = await healthCheck();
        res.status(200).json({
          status: 'healthy',
          service: serviceName,
          timestamp: new Date().toISOString(),
          pod: os.hostname(),
          environment: process.env.NODE_ENV || 'development',
          uptime: process.uptime(),
          ...healthStatus
        });
      } catch (error) {
        logger.error('Health check failed', { error: error.message });
        res.status(503).json({
          status: 'unhealthy',
          service: serviceName,
          timestamp: new Date().toISOString(),
          pod: os.hostname(),
          error: error.message
        });
      }
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
