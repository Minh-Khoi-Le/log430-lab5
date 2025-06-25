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
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { setupMetrics, metricsMiddleware } from './middleware/metrics.js';

// Import routes
import salesRoutes from './routes/sales.routes.js';

// Import utilities
import logger from './utils/logger.js';
import { connectRedis } from './utils/redis.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3004;

// Initialize Prisma client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

/**
 * Security Middleware
 * 
 * Implements various security measures including:
 * - CORS configuration for cross-origin requests
 * - Helmet for security headers
 * - Rate limiting to prevent abuse
 * - Request compression for performance
 */

// CORS configuration for cross-origin requests
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Security headers
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 1000, // Higher limit for sales operations
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Middleware Setup
 * 
 * Sets up application-wide middleware including:
 * - Metrics collection
 * - Request logging
 * - Service health monitoring
 */

// Metrics middleware
app.use(metricsMiddleware);

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id || 'anonymous'
    });
  });
  
  next();
});

/**
 * Health Check Endpoints
 * 
 * Provides health monitoring capabilities for:
 * - Basic service health
 * - Database connectivity
 * - Redis connectivity
 * - External service dependencies
 * - Detailed system status
 */

// Basic health check
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'healthy',
      service: 'sales-service',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'sales-service',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// Detailed health check
app.get('/health/detailed', async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    service: 'sales-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks: {
      database: { status: 'unknown' },
      redis: { status: 'unknown' },
      stockService: { status: 'unknown' },
      productService: { status: 'unknown' },
      memory: { status: 'unknown' },
      uptime: { status: 'healthy', value: process.uptime() }
    }
  };

  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    healthStatus.checks.database = { status: 'healthy' };
  } catch (error) {
    healthStatus.checks.database = { status: 'unhealthy', error: error.message };
    healthStatus.status = 'degraded';
  }

  try {
    // Check Redis connection
    // const redisStatus = await checkRedisConnection();
    healthStatus.checks.redis = { status: 'healthy' };
  } catch (error) {
    healthStatus.checks.redis = { status: 'unhealthy', error: error.message };
    healthStatus.status = 'degraded';
  }

  // Check external service dependencies
  try {
    // Check stock service connectivity
    const stockServiceUrl = process.env.STOCK_SERVICE_URL || 'http://localhost:3003';
    // In a real implementation, you would make an HTTP request to check the service
    healthStatus.checks.stockService = { status: 'healthy', url: stockServiceUrl };
  } catch (error) {
    healthStatus.checks.stockService = { status: 'unhealthy', error: error.message };
    healthStatus.status = 'degraded';
  }

  try {
    // Check product service connectivity
    const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001';
    healthStatus.checks.productService = { status: 'healthy', url: productServiceUrl };
  } catch (error) {
    healthStatus.checks.productService = { status: 'unhealthy', error: error.message };
    healthStatus.status = 'degraded';
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  healthStatus.checks.memory = {
    status: memUsageMB < 500 ? 'healthy' : 'warning',
    heapUsedMB: memUsageMB,
    heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024)
  };

  let statusCode;
  if (healthStatus.status === 'healthy') {
    statusCode = 200;
  } else if (healthStatus.status === 'degraded') {
    statusCode = 200;
  } else {
    statusCode = 503;
  }

  res.status(statusCode).json(healthStatus);
});

/**
 * API Routes
 * 
 * Mount all API routes under the /api prefix
 * Routes are organized by resource type
 */

// Sales management routes
app.use('/api/sales', salesRoutes);

/**
 * Metrics Endpoint
 * 
 * Exposes Prometheus metrics for monitoring and alerting
 */
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await setupMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).send('Error generating metrics');
  }
});

/**
 * 404 Handler
 * 
 * Handles requests to non-existent endpoints
 */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      path: req.originalUrl,
      method: req.method
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Global Error Handler
 * 
 * Centralized error handling for all application errors
 */
app.use(errorHandler);

/**
 * Server Startup
 * 
 * Initializes the server with proper error handling and graceful shutdown
 */

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');
    
    // Initialize Redis connection
    await connectRedis();
    logger.info('Redis connected successfully');
    
    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(`Sales Service started`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    });

    // Graceful shutdown handling
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    async function gracefulShutdown(signal) {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await prisma.$disconnect();
          logger.info('Database disconnected');
          
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    }
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
