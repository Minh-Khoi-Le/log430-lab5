/**
 * User Service Main Server (Refactored)
 * 
 * This microservice handles all user-related operations using the shared package.
 * All common middleware and utilities are now imported from @log430/shared.
 * 
 * Shared Components Used:
 * - Error handling middleware
 * - Authentication middleware
 * - Metrics collection
 * - Logging utilities
 * - Configuration management
 * - Cache middleware
 * - Validation middleware
 * 
 * @author Log430 Lab5 Team (Refactored)
 * @version 2.0.0
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
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
  metricsHandler,
  authenticate,
  optionalAuthenticate
} from '@log430/shared';

// Import local routes (these will also be refactored to use shared components)
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';

const app = express();

/**
 * Initialize application
 */
async function initializeApp() {
  try {
    // Initialize all shared services first
    await initializeSharedServices();
    
    // Get service configuration
    const serviceName = config.get('service.name', 'user-service');
    const port = config.get('service.port', 3002);
    
    logger.info(`Initializing ${serviceName}`, { port });

    // Security middleware
    app.use(helmet(config.getSecurityHeaders()));
    app.use(cors(config.getCorsConfig()));

    // Request parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Logging middleware
    app.use(morgan('combined', { stream: logger.stream }));

    // Metrics middleware
    app.use(httpMetricsMiddleware);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: serviceName,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.0.0',
        ...config.getServiceInfo()
      });
    });

    // Metrics endpoint
    app.get('/metrics', metricsHandler);

    // API routes
    app.use('/auth', authRoutes);
    app.use('/users', userRoutes);

    // 404 handler
    app.use(notFoundHandler);

    // Global error handler
    app.use(errorHandler);

    // Start server
    const server = app.listen(port, () => {
      logger.info(`${serviceName} started successfully`, {
        port,
        environment: config.get('service.environment'),
        metrics: `http://localhost:${port}/metrics`,
        health: `http://localhost:${port}/health`
      });
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

  } catch (error) {
    logger.error('Failed to initialize user service', { error: error.message });
    process.exit(1);
  }
}

// Initialize the application
initializeApp();

export default app;
