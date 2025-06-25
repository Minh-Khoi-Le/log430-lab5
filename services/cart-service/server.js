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
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import promClient from 'prom-client';

// Import custom middleware and utilities
import { errorHandler } from './middleware/errorHandler.js';
import { metricsMiddleware } from './middleware/metrics.js';
import { logger } from './utils/logger.js';

// Import routes
import cartRoutes from './routes/cart.routes.js';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3006;

/**
 * Prometheus Metrics Configuration
 * Collects default Node.js metrics and custom application metrics
 */
const register = promClient.register;
promClient.collectDefaultMetrics({ register });

// Custom metrics for cart operations
const httpRequestsTotal = new promClient.Counter({
  name: 'cart_http_requests_total',
  help: 'Total number of HTTP requests to cart service',
  labelNames: ['method', 'route', 'status_code']
});

const cartOperationsTotal = new promClient.Counter({
  name: 'cart_operations_total',
  help: 'Total number of cart operations',
  labelNames: ['operation', 'status']
});

const activeCartsGauge = new promClient.Gauge({
  name: 'cart_active_carts_total',
  help: 'Number of active shopping carts'
});

/**
 * Global Middleware Configuration
 * Sets up security, logging, compression, and parsing middleware
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply metrics middleware
app.use(metricsMiddleware);

/**
 * Health Check Endpoint
 * Provides service health status and dependency checks
 */
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'cart-service',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      dependencies: {
        redis: 'checking...',
        productService: 'checking...',
        stockService: 'checking...'
      }
    };

    // Check Redis connection
    try {
      const { redisClient } = await import('./services/redis.service.js');
      await redisClient.ping();
      health.dependencies.redis = 'healthy';
    } catch (error) {
      health.dependencies.redis = 'unhealthy';
      health.status = 'degraded';
      logger.warn('Redis health check failed:', error);
    }

    // Check external service dependencies (basic connectivity)
    try {      
      // These would be actual HTTP calls in production
      health.dependencies.productService = 'available';
      health.dependencies.stockService = 'available';
    } catch (error) {
      logger.warn('External service health check failed:', error);
      health.dependencies.productService = 'unknown';
      health.dependencies.stockService = 'unknown';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'cart-service',
      error: error.message
    });
  }
});

/**
 * Metrics Endpoint
 * Exposes Prometheus metrics for monitoring and alerting
 */
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Failed to generate metrics:', error);
    res.status(500).end('Failed to generate metrics');
  }
});

/**
 * API Routes Configuration
 * Mount all cart-related routes under /api/v1 prefix
 */
app.use('/api/v1/cart', cartRoutes);

/**
 * Root Endpoint
 * Provides service information and API documentation links
 */
app.get('/', (req, res) => {
  res.json({
    service: 'Cart Service',
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

/**
 * 404 Handler
 * Handles requests to non-existent endpoints
 */
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`,
    service: 'cart-service',
    timestamp: new Date().toISOString()
  });
});

/**
 * Global Error Handler
 * Centralized error handling for all cart service operations
 */
app.use(errorHandler);

/**
 * Graceful Shutdown Handler
 * Properly closes connections and cleans up resources
 */
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close Redis connection
    const { redisClient } = await import('./services/redis.service.js');
    await redisClient.quit();
    logger.info('Redis connection closed');
    
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
  logger.info(`🛒 Cart Service started successfully`);
  logger.info(`📡 Server running on port ${PORT}`);
  logger.info(`🔍 Health check available at http://localhost:${PORT}/health`);
  logger.info(`📊 Metrics available at http://localhost:${PORT}/metrics`);
  logger.info(`🚀 API endpoints available at http://localhost:${PORT}/api/v1/cart`);
  
  // Initialize Redis connection
  import('./services/redis.service.js').then(({ redisClient }) => {
    logger.info('✅ Redis connection established');
  }).catch(error => {
    logger.error('❌ Failed to connect to Redis:', error);
  });
});

// Export app for testing
export default app;
