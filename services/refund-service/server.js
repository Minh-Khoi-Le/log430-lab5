/**
 * Refund Service Server
 * 
 * Main entry point for the Refund Service microservice.
 * This service manages refund processing, approval workflows, and refund analytics
 * for both physical stores and e-commerce operations.
 * 
 * Core Responsibilities:
 * - Refund request processing with validation
 * - Multi-level approval workflows
 * - Integration with sales and stock services
 * - Refund analytics and reporting
 * - Audit logging and compliance
 * - Customer notification management
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
 * @author Refund Service Team
 * @version 1.0.0
 */

import express from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

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
import refundRoutes from './routes/refund.routes.js';

// Load environment variables
dotenv.config();

// Initialize Express app and database connection
const app = express();
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

async function initializeApp() {
  try {
    // Initialize shared services first
    await initializeSharedServices();
    
    const PORT = config.get('PORT') || 3007;
    
    logger.info('Initializing Refund Service...');

    // Apply shared middleware
    app.use(httpMetricsMiddleware);
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    /**
     * Health Check Endpoint
     * Provides comprehensive health status including database and cache connectivity
     */
    app.get('/health', async (req, res) => {
      try {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'refund-service',
          version: process.env.npm_package_version || '1.0.0',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          dependencies: {
            database: 'checking...',
            cache: 'checking...',
            salesService: 'checking...'
          }
        };

        // Check database connection
        try {
          await prisma.$queryRaw`SELECT 1`;
          health.dependencies.database = 'healthy';
        } catch (error) {
          health.dependencies.database = 'unhealthy';
          health.status = 'degraded';
          logger.warn('Database health check failed:', error);
        }

        // Check cache connection (if available)
        try {
          const { redisService } = await import('@log430/shared');
          await redisService.ping();
          health.dependencies.cache = 'healthy';
        } catch (error) {
          health.dependencies.cache = 'unhealthy';
          logger.warn('Cache health check failed:', error);
        }

        // Check sales service dependency
        try {
          // This would be an actual HTTP call in production
          health.dependencies.salesService = 'available';
        } catch (error) {
          health.dependencies.salesService = 'unknown';
          logger.warn('Sales service health check failed:', error);
        }

        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          service: 'refund-service',
          error: error.message
        });
      }
    });

    /**
     * Metrics Endpoint
     * Uses shared metrics handler
     */
    app.get('/metrics', metricsHandler);

    /**
     * API Routes
     * Mount refund-specific routes under /api/v1/refunds
     */
    app.use('/api/v1/refunds', refundRoutes);

    /**
     * Service Information Endpoint
     * Provides metadata about the refund service
     */
    app.get('/', (req, res) => {
      res.json({
        service: 'refund-service',
        version: '1.0.0',
        description: 'Refund Processing and Management Microservice',
        endpoints: {
          health: '/health',
          metrics: '/metrics',
          api: '/api/v1/refunds'
        },
        features: [
          'Refund request processing',
          'Approval workflows',
          'Sales integration',
          'Audit logging',
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
     * Initialize the refund service and begin accepting requests
     */
    const server = app.listen(PORT, () => {
      logger.info(`💸 Refund Service started successfully`);
      logger.info(`📡 Server running on port ${PORT}`);
      logger.info(`🔍 Health check available at http://localhost:${PORT}/health`);
      logger.info(`📊 Metrics available at http://localhost:${PORT}/metrics`);
      logger.info(`🚀 API endpoints available at http://localhost:${PORT}/api/v1/refunds`);
    });

    return server;

  } catch (error) {
    logger.error('Failed to initialize Refund Service:', error);  
    process.exit(1);
  }
}

// Initialize and start the application
initializeApp().catch(error => {
  logger.error('Failed to start Refund Service:', error);
  process.exit(1);
});

// Export app for testing
export default app;
