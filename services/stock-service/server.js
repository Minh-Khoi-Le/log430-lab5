/**
 * Stock Service Server
 * 
 * Main entry point for the Stock Service microservice.
 * This service manages inventory levels, stock operations, and product availability
 * across multiple stores in the e-commerce system.
 * 
 * Core Responsibilities:
 * - Stock level management across stores
 * - Inventory tracking and updates
 * - Stock availability queries
 * - Stock movement operations (transfers, adjustments)
 * - Integration with sales and product services
 * 
 * Technical Features:
 * - Express.js REST API
 * - Redis caching for performance
 * - Prometheus metrics collection
 * - JWT authentication
 * - Comprehensive error handling
 * - Health check endpoints
 * 
 * @author Stock Service Team
 * @version 1.0.0
 */

import express from 'express';
import dotenv from 'dotenv';

// Import shared components
import {
  initializeSharedServices,
  cleanupSharedServices,
  config,
  logger,
  errorHandler,
  notFoundHandler,
  healthCheck,
  httpMetricsMiddleware,
  metricsHandler
} from '../shared/index.js';

// Import routes
import stockRoutes from './routes/stock.routes.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

async function initializeApp() {
  try {
    // Initialize shared services including database
    await initializeSharedServices({
      serviceName: 'stock-service',
      enableDatabase: true,
      enableDatabaseLogging: process.env.NODE_ENV === 'development'
    });
    
    const PORT = config.get('service.port') || 3004;
    
    logger.info('Initializing Stock Service...');

    // Apply shared middleware
    app.use(httpMetricsMiddleware);
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    /**
     * Health Check Endpoint
     * Provides comprehensive health status including database and cache connectivity
     */
    app.get('/health', healthCheck('stock-service', ['database', 'redis']));

    /**
     * Metrics Endpoint
     * Uses shared metrics handler
     */
    app.get('/metrics', metricsHandler);

    /**
     * API Routes
     * All stock-related endpoints are prefixed with /api
     * Also providing direct access at /stock for API Gateway
     */
    app.use('/stock', stockRoutes);
    app.use('/api/stock', stockRoutes);
    app.use('/api/v1/stock', stockRoutes);

    /**
     * Service Information Endpoint
     * Provides metadata about the stock service
     */
    app.get('/', (req, res) => {
      res.json({
        service: 'stock-service',
        version: '1.0.0',
        description: 'Inventory and Stock Management Microservice',
        endpoints: {
          health: '/health',
          metrics: '/metrics',
          api: '/api/v1/stock'
        },
        features: [
          'Multi-store inventory management',
          'Real-time stock level tracking',
          'Stock movement operations',
          'Low stock alerts',
          'Inventory analytics'
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
        // Close database connection
        await prisma.$disconnect();
        logger.info('Database connection closed');
        
        // Cleanup shared services
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
     * Initialize the stock service and begin accepting requests
     */
    const server = app.listen(PORT, () => {
      logger.info(` Stock Service started successfully`);
      logger.info(` Server running on port ${PORT}`);
      logger.info(` Health check available at http://localhost:${PORT}/health`);
      logger.info(` Metrics available at http://localhost:${PORT}/metrics`);
      logger.info(` API endpoints available at http://localhost:${PORT}/api/v1/stock`);
    });

    return server;

  } catch (error) {
    logger.error('Failed to initialize Stock Service:', error);
    process.exit(1);
  }
}

// Initialize and start the application
initializeApp().catch(error => {
  logger.error('Failed to start Stock Service:', error);
  process.exit(1);
});

// Export app for testing
export default app;
