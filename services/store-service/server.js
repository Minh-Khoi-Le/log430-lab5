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
  healthCheck
} from '../shared/index.js';

// Import routes
import storeRoutes from './routes/store.routes.js';

// Initialize Express app
const app = express();

async function initializeApp() {
  try {
    // Initialize shared services first
    await initializeSharedServices({
      serviceName: 'store-service',
      enableDatabase: true,
      enableDatabaseLogging: process.env.NODE_ENV === 'development'
    });
    
    const PORT = config.get('PORT') || 3003;
    
    logger.info('Initializing Store Service...');

    // Apply shared middleware
    app.use(httpMetricsMiddleware);
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    /**
     * Health Check Endpoint
     * Provides comprehensive health status including database connectivity
     */
    app.get('/health', healthCheck('store-service', ['database', 'redis']));

    /**
     * Metrics Endpoint
     * Uses shared metrics handler
     */
    app.get('/metrics', metricsHandler);

    /**
     * API Routes
     * Mount store routes at both /stores and /api/stores to handle Kong routing
     */
    app.use('/stores', storeRoutes);
    app.use('/api/stores', storeRoutes);

    /**
     * Service Information Endpoint
     * Provides metadata about the store service
     */
    app.get('/', (req, res) => {
      res.json({
        service: 'store-service',
        version: '1.0.0',
        description: 'Store Information Management Microservice',
        endpoints: {
          health: '/health',
          metrics: '/metrics',
          api: '/stores',
          api_alt: '/api/stores'
        },
        features: [
          'Store CRUD operations',
          'Location management',
          'Operational status tracking',
          'Performance analytics',
          'Multi-store coordination'
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
     * Initialize the store service and begin accepting requests
     */
    const server = app.listen(PORT, () => {
      logger.info(` Store Service started successfully`);
      logger.info(` Server running on port ${PORT}`);
      logger.info(` Health check available at http://localhost:${PORT}/health`);
      logger.info(` Metrics available at http://localhost:${PORT}/metrics`);
      logger.info(` API endpoints available at http://localhost:${PORT}/api/v1/stores`);
    });

    return server;

  } catch (error) {
    logger.error('Failed to initialize Store Service:', error);
    process.exit(1);
  }
}

// Initialize and start the application
initializeApp().catch(error => {
  logger.error('Failed to start Store Service:', error);
  process.exit(1);
});

// Export app for testing
export default app;
