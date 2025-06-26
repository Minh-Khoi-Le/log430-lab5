/**
 * User Service Main Server - Simplified version without Prisma queries
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
  notFoundHandler
} from '@log430/shared';

// Initialize Express app
const app = express();

// Parse JSON bodies
app.use(express.json());

async function initializeApp() {
  try {
    // Initialize all shared services first
    await initializeSharedServices();
    
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
        version: '1.0.0',
        description: 'User authentication and management microservice (simplified)',
        pod: os.hostname(),
        status: 'running'
      });
    });

    // Simple user API
    app.post('/auth/login', (req, res) => {
      const { email, password } = req.body;
      
      // Very basic login simulation
      if (email === 'user@example.com' && password === 'password') {
        res.json({
          success: true,
          data: {
            user: {
              id: 1,
              email: 'user@example.com',
              name: 'Test User',
              role: 'client'
            },
            token: 'sample-jwt-token-would-be-here',
            refreshToken: 'sample-refresh-token-would-be-here'
          },
          message: 'Login successful',
          service: serviceName
        });
      } else {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
          service: serviceName
        });
      }
    });

    app.post('/auth/register', (req, res) => {
      const { email, password, name } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input',
          message: 'Email, password, and name are required',
          service: serviceName
        });
      }
      
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: 999,
            email,
            name,
            role: 'client',
            createdAt: new Date().toISOString()
          },
          token: 'sample-jwt-token-would-be-here',
          refreshToken: 'sample-refresh-token-would-be-here'
        },
        message: 'User registered successfully',
        service: serviceName
      });
    });

    app.get('/users/profile', (req, res) => {
      // Normally would verify token here
      res.json({
        success: true,
        data: {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          role: 'client',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        },
        message: 'User profile retrieved successfully',
        service: serviceName
      });
    });

    // Health check endpoint - used by load balancers and service discovery
    app.get('/health', async (req, res) => {
      res.status(200).json({
        status: 'healthy',
        service: serviceName,
        timestamp: new Date().toISOString(),
        pod: os.hostname(),
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime()
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
