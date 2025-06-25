/**
 * Main Express Application Configuration
 * 
 * This file sets up the Express application with all necessary middleware,
 * security configurations, API routes, and error handling.
 * It serves as the central configuration point for the entire backend.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { errorHandler } from './middleware/errorHandler.js';

// Initialize Express application
const app = express();

/**
 * Security Middleware Configuration
 * 
 * helmet: Helps secure Express apps by setting HTTP response headers
 * cors: Enables Cross-Origin Resource Sharing with specific configuration
 *       to control which domains can access the API
 */
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
  credentials: true
}));

/**
 * Request Logging
 * 
 * morgan: HTTP request logger middleware that logs all incoming requests
 * with detailed information in combined format (remote address, date, method, URL, etc.)
 */
app.use(morgan('combined'));

/**
 * Request Body Parsing
 * 
 * Configures middleware to parse incoming JSON payloads and URL-encoded data
 * Makes request data available on req.body for route handlers
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * API Documentation Setup
 * 
 * Loads StoreAPI/Swagger specification from YAML file
 * Serves interactive API documentation at /api/docs endpoint
 */
const swaggerDoc = YAML.load('./docs/storeapi.yaml');
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

/**
 * API Routes Registration
 * 
 * Each route module handles a specific domain of the application
 */
app.use('/api/v1/products', (await import('./routes/product.routes.js')).default);
app.use('/api/v1/stores', (await import('./routes/store.routes.js')).default);
app.use('/api/v1/sales', (await import('./routes/sale.routes.js')).default);
app.use('/api/v1/maisonmere', (await import('./routes/maisonmere.routes.js')).default);
app.use('/api/v1/users', (await import('./routes/user.routes.js')).default);
app.use('/api/v1/stock', (await import('./routes/stock.routes.js')).default);
app.use('/api/v1/refunds', (await import('./routes/refund.routes.js')).default);

/**
 * API Health Check Endpoint
 * 
 * Health check endpoint under API v1 namespace
 */
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    api: 'v1'
  });
});

/**
 * Global Error Handling Middleware
 * 
 * Catches all errors thrown in route handlers and middleware
 * Formats error responses consistently across the API
 */
app.use(errorHandler);

/**
 * Health Check Endpoint
 * 
 * Comprehensive endpoint to verify API is running and healthy
 * Returns status, timestamp, and environment information
 */
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

export default app;
