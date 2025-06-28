/**
 * Sales Service Server
 * 
 * Main entry point for the Sales Service microservice.
 * This service manages transaction processing, sales history, and sales analytics
 * for both physical stores and e-commerce operations.
 * 
 * Core Responsibilities:
 * - Sales transaction processing with validation
 * - Sales history and reporting
 * - Integration with stock service for inventory updates
 * - Integration with cart service for e-commerce checkouts
 * - Sales analytics and performance metrics
 * - Refund processing coordination
 * 
 * Technical Features:
 * - Express.js REST API
 * - Redis caching for performance
 * - Prometheus metrics collection
 * - JWT authentication
 * - Comprehensive error handling
 * - Health check endpoints
 * - Service-to-service communication
 * 
 * @author Sales Service Team
 * @version 1.0.0
 */

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

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
  getDatabaseClient,
  healthCheck
} from '../shared/index.js';

// Import routes
import salesRoutes from './routes/sales.routes.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

async function initializeApp() {
  try {
    // Initialize shared services first
    await initializeSharedServices({
      serviceName: 'sales-service',
      enableDatabase: true,
      enableDatabaseLogging: process.env.NODE_ENV === 'development'
    });
    
    const PORT = config.get('service.port') || 3005;
    
    logger.info('Initializing Sales Service...');

    // Apply shared middleware
    app.use(cors());
    app.use(httpMetricsMiddleware);
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    /**
     * Health Check Endpoint
     * Provides comprehensive health status including database and cache connectivity
     */
    app.get('/health', healthCheck('sales-service', ['database', 'redis']));

    /**
     * Metrics Endpoint
     * Uses shared metrics handler
     */
    app.get('/metrics', metricsHandler);

    /**
     * API Routes
     * All sales-related endpoints are prefixed with /api
     * Also support direct /sales for Kong gateway routing
     */
    app.use('/sales', salesRoutes);
    app.use('/api/sales', salesRoutes);
    app.use('/api/v1/sales', salesRoutes);

    /**
     * Service Information Endpoint
     * Provides metadata about the sales service
     */
    app.get('/', (req, res) => {
      res.json({
        service: 'sales-service',
        version: '1.0.0',
        description: 'Sales Transaction Processing Microservice',
        endpoints: {
          health: '/health',
          metrics: '/metrics',
          api: '/api/v1/sales'
        },
        features: [
          'Transaction processing',
          'Sales history tracking',
          'Analytics and reporting',
          'Stock integration',
          'Multi-store support'
        ]
      });
    });

    // Apply shared error handlers
    app.use(notFoundHandler);
    app.use(errorHandler);

    /**
     * Graceful Shutdown Handler
     * Properly closes connections and cleans up resources
     */
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      try {
        // Cleanup shared services (includes database)
        await cleanupSharedServices();
        
        // Close HTTP server
        server.close(() => {
          logger.info('HTTP server closed');
          process.exit(0);
        });
        
        // Force shutdown after timeout
        setTimeout(() => {
          logger.error('Forced shutdown due to timeout');
          process.exit(1);
        }, 10000);
        
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    /**
     * Start Server
     * Initialize the sales service and begin accepting requests
     */
    const server = app.listen(PORT, () => {
      logger.info(` Sales Service started successfully`);
      logger.info(` Server running on port ${PORT}`);
      logger.info(` Health check available at http://localhost:${PORT}/health`);
      logger.info(` Metrics available at http://localhost:${PORT}/metrics`);
      logger.info(` API endpoints available at http://localhost:${PORT}/api/v1/sales`);
    });

    return server;

  } catch (error) {
    logger.error('Failed to initialize Sales Service:', error);
    process.exit(1);
  }
}

// Initialize and start the application
initializeApp().catch(error => {
  logger.error('Failed to start Sales Service:', error);
  process.exit(1);
});

// Export app for testing
export default app;
