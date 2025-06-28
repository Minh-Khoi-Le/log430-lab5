/**
 * Cart Service - Main Server Entry Point
 * 
 * This microservice handles shopping cart operations including:
 * - Adding/removing items from cart
 * - Updating item quantities
 * - Cart persistence and management
 * - Integration with Product and Stock services
 * 
 * Architecture: Express.js server with Redis for cart storage and Prometheus metrics
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
import cartRoutes from './routes/cart.routes.js';

// Initialize Express app
const app = express();

async function initializeApp() {
  try {
    // Initialize shared services including database
    await initializeSharedServices({
      serviceName: 'cart-service',
      enableDatabase: true,
      enableDatabaseLogging: process.env.NODE_ENV === 'development'
    });
    
    const PORT = config.get('service.port') || 3007;
    
    logger.info('Initializing Cart Service...');

    // Apply shared middleware
    app.use(httpMetricsMiddleware);
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    /**
     * Health Check Endpoint
     * Provides service health status and dependency checks
     */
    app.get('/health', healthCheck('cart-service', ['database', 'redis']));

    /**
     * Metrics Endpoint
     * Exposes Prometheus metrics
     */
    app.get('/metrics', metricsHandler);

    /**
     * API Routes
     * Mount cart-specific routes under /api/v1/cart
     * Also support direct /cart for Kong gateway routing
     */
    app.use('/cart', cartRoutes);
    app.use('/api/cart', cartRoutes);
    app.use('/api/v1/cart', cartRoutes);

    /**
     * Service Information Endpoint
     * Provides metadata about the cart service
     */
    app.get('/', (req, res) => {
      res.json({
        service: 'cart-service',
        version: '1.0.0',
        description: 'Shopping Cart Management Microservice',
        endpoints: {
          health: '/health',
          metrics: '/metrics',
          api: '/api/v1/cart',
          documentation: '/api/v1/cart/docs'
        },
        features: [
          'Add/remove cart items',
          'Update item quantities',
          'Cart persistence with Redis',
          'Product availability validation',
          'Multi-store cart support',
          'Real-time inventory checking'
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
        // Cleanup shared services (includes database and Redis)
        await cleanupSharedServices({ serviceName: 'cart-service' });
        
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
     * Initialize the cart service and begin accepting requests
     */
    const server = app.listen(PORT, () => {
      logger.info(` Cart Service started successfully`);
      logger.info(` Server running on port ${PORT}`);
      logger.info(` Health check available at http://localhost:${PORT}/health`);
      logger.info(` Metrics available at http://localhost:${PORT}/metrics`);
      logger.info(` API endpoints available at http://localhost:${PORT}/api/v1/cart`);
    });

    return server;

  } catch (error) {
    logger.error('Failed to initialize Cart Service:', error);
    process.exit(1);
  }
}

// Initialize and start the application
initializeApp().catch(error => {
  logger.error('Failed to start Cart Service:', error);
  process.exit(1);
});

// Export app for testing
export default app;
