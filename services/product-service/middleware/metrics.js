/**
 * Metrics Middleware for Product Service
 * 
 * Implements Prometheus metrics collection for monitoring and observability.
 * Tracks key performance indicators specific to product service operations:
 * - HTTP request metrics (duration, count, status codes)
 * - Product-specific metrics (catalog size, most accessed products)
 * - Service health metrics (response times, error rates)
 * - Resource utilization metrics (memory, CPU)
 * 
 * These metrics are exposed at /metrics endpoint and can be scraped by Prometheus
 * for integration with monitoring systems like Grafana.
 */

import promClient from 'prom-client';
import os from 'os';

// Enable collection of default Node.js metrics (memory, CPU, etc.)
promClient.collectDefaultMetrics({
  prefix: 'product_service_',
});

// HTTP request duration histogram - tracks response times
const httpRequestDuration = new promClient.Histogram({
  name: 'product_service_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds for product service',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5] // Response time buckets in seconds
});

// HTTP request counter - tracks total number of requests
const httpRequestTotal = new promClient.Counter({
  name: 'product_service_http_requests_total',
  help: 'Total number of HTTP requests to product service',
  labelNames: ['method', 'route', 'status_code']
});

// Product-specific metrics

// Product catalog size gauge - tracks total number of products
const productCatalogSize = new promClient.Gauge({
  name: 'product_service_catalog_size',
  help: 'Total number of products in the catalog'
});

// Product access counter - tracks which products are accessed most
const productAccessCounter = new promClient.Counter({
  name: 'product_service_product_access_total',
  help: 'Total number of times individual products have been accessed',
  labelNames: ['product_id', 'operation'] // operation: view, create, update, delete
});

// Database operation metrics
const databaseOperationDuration = new promClient.Histogram({
  name: 'product_service_database_operation_duration_seconds',
  help: 'Duration of database operations for product service',
  labelNames: ['operation'], // operation: select, insert, update, delete
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

// Error rate counter - tracks different types of errors
const errorCounter = new promClient.Counter({
  name: 'product_service_errors_total',
  help: 'Total number of errors in product service',
  labelNames: ['type', 'endpoint'] // type: validation, database, auth, etc.
});

/**
 * Middleware to collect HTTP request metrics
 * Measures request duration and counts requests by method, route, and status
 */
export const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Override res.end to capture metrics when response is sent
  const originalEnd = res.end;
  res.end = function(...args) {
    // Calculate request duration
    const duration = (Date.now() - startTime) / 1000;
    
    // Extract route pattern (remove dynamic parameters for consistent labeling)
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    const statusCode = res.statusCode;

    // Record metrics
    httpRequestDuration
      .labels(method, route, statusCode)
      .observe(duration);

    httpRequestTotal
      .labels(method, route, statusCode)
      .inc();

    // Call original end function
    originalEnd.apply(this, args);
  };

  next();
};

/**
 * Helper function to record product-specific operations
 * Call this from controllers when products are accessed or modified
 */
export const recordProductOperation = (productId, operation) => {
  productAccessCounter
    .labels(productId?.toString() || 'unknown', operation)
    .inc();
};

/**
 * Helper function to record database operation duration
 * Call this around database operations in DAOs/services
 */
export const recordDatabaseOperation = async (operation, operationFn) => {
  const startTime = Date.now();
  
  try {
    const result = await operationFn();
    const duration = (Date.now() - startTime) / 1000;
    
    databaseOperationDuration
      .labels(operation)
      .observe(duration);
    
    return result;
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    
    databaseOperationDuration
      .labels(operation)
      .observe(duration);
    
    // Record error
    errorCounter
      .labels('database', operation)
      .inc();
    
    throw error;
  }
};

/**
 * Helper function to record errors by type and endpoint
 */
export const recordError = (errorType, endpoint) => {
  errorCounter
    .labels(errorType, endpoint)
    .inc();
};

/**
 * Update catalog size metric
 * Should be called periodically or when catalog changes significantly
 */
export const updateCatalogSize = async (prisma) => {
  try {
    const count = await prisma.product.count();
    productCatalogSize.set(count);
  } catch (error) {
    console.error('Failed to update catalog size metric:', error);
  }
};

/**
 * Setup metrics endpoint
 * Exposes all collected metrics at /metrics for Prometheus scraping
 */
export const metricsEndpoint = (app) => {
  app.get('/metrics', async (req, res) => {
    try {
      // Set appropriate content type for Prometheus
      res.set('Content-Type', promClient.register.contentType);
      
      // Return all collected metrics
      const metrics = await promClient.register.metrics();
      res.end(metrics);
    } catch (error) {
      console.error('Error generating metrics:', error);
      res.status(500).json({
        error: 'Failed to generate metrics',
        service: 'product-service'
      });
    }
  });

  // Additional metrics endpoint with service information
  app.get('/metrics/info', (req, res) => {
    res.json({
      service: 'product-service',
      version: '1.0.0',
      pod: os.hostname(),
      metricsAvailable: [
        'product_service_http_request_duration_seconds',
        'product_service_http_requests_total',
        'product_service_catalog_size',
        'product_service_product_access_total',
        'product_service_database_operation_duration_seconds',
        'product_service_errors_total'
      ],
      lastUpdated: new Date().toISOString()
    });
  });
};
