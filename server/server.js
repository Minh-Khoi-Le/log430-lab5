/**
 * Server Entry Point
 * 
 * This file is the main entry point for the application.
 * It imports the configured Express application from index.js,
 * sets up the server port, and starts the HTTP server.
 * 
 * The server listens on the port specified in the PORT environment variable,
 * or defaults to port 3000 if no environment variable is set.
 */

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/errorHandler.js';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { fileURLToPath } from 'url';
import path from 'path';
import { metricsMiddleware, metricsEndpoint, podIdentifier } from './middleware/metrics.js';
import os from 'os';

// Import routes
import userRoutes from './routes/user.routes.js';
import productRoutes from './routes/product.routes.js';
import storeRoutes from './routes/store.routes.js';
import stockRoutes from './routes/stock.routes.js';
import saleRoutes from './routes/sale.routes.js';
import maisonMereRoutes from './routes/maisonmere.routes.js';
import refundRoutes from './routes/refund.routes.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log pod hostname on startup
console.log(`Starting server on pod: ${os.hostname()}`);

// Middleware
app.use(cors({
  exposedHeaders: ['Authorization']
}));
app.use(express.json());
app.use(metricsMiddleware);
app.use(podIdentifier);  // Add pod identifier to response headers
metricsEndpoint(app);

// API Documentation Setup
try {
  const swaggerDoc = YAML.load(path.join(__dirname, './docs/storeapi.yaml'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
  console.log(' Api documentation available at http://localhost:3000/api/docs');
} catch (err) {
  console.error('Failed to load Swagger documentation:', err);
}

// Root route
app.get('/', (req, res) => {
  res.send(`Welcome to LOG430 API (served by pod: ${os.hostname()})`);
});

// API routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/stores', storeRoutes);
app.use('/api/v1/stocks', stockRoutes);
app.use('/api/v1/sales', saleRoutes);
app.use('/api/v1/maisonmere', maisonMereRoutes);
app.use('/api/v1/refunds', refundRoutes);

// API Health check endpoint
app.get('/api/v1/health', async (req, res) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      pod: os.hostname(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development',
      api: 'v1'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error',
      timestamp: new Date().toISOString(),
      pod: os.hostname(),
      database: 'disconnected',
      environment: process.env.NODE_ENV || 'development',
      api: 'v1',
      error: error.message
    });
  }
});

// Error handler
app.use(errorHandler);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      pod: os.hostname(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error',
      timestamp: new Date().toISOString(),
      pod: os.hostname(),
      database: 'disconnected',
      environment: process.env.NODE_ENV || 'development',
      error: error.message
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (pod: ${os.hostname()})`);
});

export { app, server, prisma }; 