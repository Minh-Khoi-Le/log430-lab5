/**
 * Shared Metrics Middleware
 * 
 * Provides Prometheus metrics collection for monitoring and observability.
 * Tracks HTTP requests, operations, and service performance across all microservices.
 * 
 * @author Log430 Lab5 Team
 * @version 1.0.0
 */

import promClient from 'prom-client';
import { logger } from '../utils/logger.js';

// Get service name from environment
const SERVICE_NAME = process.env.SERVICE_NAME || 'unknown-service';

// Create Prometheus registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ 
  register,
  prefix: `${SERVICE_NAME.replace(/-/g, '_')}_`
});

/**
 * HTTP Request Metrics
 */
const httpRequestsTotal = new promClient.Counter({
  name: `${SERVICE_NAME.replace(/-/g, '_')}_http_requests_total`,
  help: `Total number of HTTP requests to ${SERVICE_NAME}`,
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestDuration = new promClient.Histogram({
  name: `${SERVICE_NAME.replace(/-/g, '_')}_http_request_duration_seconds`,
  help: `Duration of HTTP requests in seconds for ${SERVICE_NAME}`,
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register]
});

const httpRequestSize = new promClient.Histogram({
  name: `${SERVICE_NAME.replace(/-/g, '_')}_http_request_size_bytes`,
  help: `Size of HTTP requests in bytes for ${SERVICE_NAME}`,
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register]
});

const httpResponseSize = new promClient.Histogram({
  name: `${SERVICE_NAME.replace(/-/g, '_')}_http_response_size_bytes`,
  help: `Size of HTTP responses in bytes for ${SERVICE_NAME}`,
  labelNames: ['method', 'route', 'status_code'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register]
});

/**
 * Business Operation Metrics
 */
const operationsTotal = new promClient.Counter({
  name: `${SERVICE_NAME.replace(/-/g, '_')}_operations_total`,
  help: `Total number of business operations in ${SERVICE_NAME}`,
  labelNames: ['operation', 'status'],
  registers: [register]
});

const operationDuration = new promClient.Histogram({
  name: `${SERVICE_NAME.replace(/-/g, '_')}_operation_duration_seconds`,
  help: `Duration of business operations in seconds for ${SERVICE_NAME}`,
  labelNames: ['operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register]
});

/**
 * Database Metrics
 */
const databaseOperationsTotal = new promClient.Counter({
  name: `${SERVICE_NAME.replace(/-/g, '_')}_database_operations_total`,
  help: `Total number of database operations in ${SERVICE_NAME}`,
  labelNames: ['operation', 'table', 'status'],
  registers: [register]
});

const databaseOperationDuration = new promClient.Histogram({
  name: `${SERVICE_NAME.replace(/-/g, '_')}_database_operation_duration_seconds`,
  help: `Duration of database operations in seconds for ${SERVICE_NAME}`,
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register]
});

/**
 * Cache Metrics
 */
const cacheOperationsTotal = new promClient.Counter({
  name: `${SERVICE_NAME.replace(/-/g, '_')}_cache_operations_total`,
  help: `Total number of cache operations in ${SERVICE_NAME}`,
  labelNames: ['operation', 'status'],
  registers: [register]
});

const cacheHitRatio = new promClient.Gauge({
  name: `${SERVICE_NAME.replace(/-/g, '_')}_cache_hit_ratio`,
  help: `Cache hit ratio for ${SERVICE_NAME}`,
  registers: [register]
});

/**
 * Error Metrics
 */
const errorsTotal = new promClient.Counter({
  name: `${SERVICE_NAME.replace(/-/g, '_')}_errors_total`,
  help: `Total number of errors in ${SERVICE_NAME}`,
  labelNames: ['type', 'severity'],
  registers: [register]
});

/**
 * Active Connections/Users
 */
const activeConnectionsGauge = new promClient.Gauge({
  name: `${SERVICE_NAME.replace(/-/g, '_')}_active_connections`,
  help: `Number of active connections to ${SERVICE_NAME}`,
  registers: [register]
});

/**
 * Memory Usage Gauge
 */
const memoryUsageGauge = new promClient.Gauge({
  name: `${SERVICE_NAME.replace(/-/g, '_')}_memory_usage_bytes`,
  help: `Memory usage in bytes for ${SERVICE_NAME}`,
  labelNames: ['type'],
  registers: [register]
});

/**
 * Track cache hit/miss ratio
 */
let cacheHits = 0;
let cacheMisses = 0;

/**
 * HTTP Metrics Middleware
 * 
 * Tracks HTTP request metrics including duration, status codes, etc.
 */
export const httpMetricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const startHrTime = process.hrtime();

  // Increment active connections
  activeConnectionsGauge.inc();

  // Track request size
  const requestSize = parseInt(req.get('Content-Length') || '0', 10);
  if (requestSize > 0) {
    httpRequestSize.observe(
      { method: req.method, route: req.route?.path || req.path },
      requestSize
    );
  }

  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    // Calculate duration
    const duration = Date.now() - startTime;
    const hrDuration = process.hrtime(startHrTime);
    const durationInSeconds = hrDuration[0] + hrDuration[1] / 1e9;

    // Get route path (try to get actual route, fallback to path)
    const route = req.route?.path || req.path;
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status_code: statusCode
    });

    httpRequestDuration.observe(
      { method: req.method, route: route, status_code: statusCode },
      durationInSeconds
    );

    // Track response size
    const responseSize = parseInt(res.get('Content-Length') || '0', 10);
    if (responseSize > 0) {
      httpResponseSize.observe(
        { method: req.method, route: route, status_code: statusCode },
        responseSize
      );
    }

    // Decrement active connections
    activeConnectionsGauge.dec();

    // Log metrics for debugging
    logger.debug('HTTP Request Metrics', {
      method: req.method,
      route: route,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestSize,
      responseSize
    });

    // Call original end method
    originalEnd.apply(this, args);
  };

  next();
};

/**
 * Record business operation metrics
 */
export const recordOperation = (operation, status = 'success', duration = null) => {
  operationsTotal.inc({ operation, status });
  
  if (duration !== null) {
    operationDuration.observe({ operation }, duration / 1000); // Convert to seconds
  }
  
  logger.debug('Operation Recorded', { operation, status, duration });
};

/**
 * Record database operation metrics
 */
export const recordDatabaseOperation = (operation, table, duration, status = 'success') => {
  // Ensure operation and table are defined
  const op = operation || 'unknown';
  const tbl = table || 'unknown';
  
  // Ensure duration is a valid number
  let durationValue = 0;
  if (duration !== undefined && duration !== null && !isNaN(duration)) {
    durationValue = duration / 1000; // Convert to seconds
  }
  
  databaseOperationsTotal.inc({ operation: op, table: tbl, status });
  databaseOperationDuration.observe({ operation: op, table: tbl }, durationValue);
  
  logger.debug('Database Operation Recorded', { operation: op, table: tbl, duration: durationValue, status });
};

/**
 * Record cache operation metrics
 */
export const recordCacheOperation = (operation, hit = false) => {
  const status = hit ? 'hit' : 'miss';
  cacheOperationsTotal.inc({ operation, status });
  
  // Update hit ratio calculation
  if (hit) {
    cacheHits++;
  } else {
    cacheMisses++;
  }
  
  const totalOperations = cacheHits + cacheMisses;
  if (totalOperations > 0) {
    cacheHitRatio.set(cacheHits / totalOperations);
  }
  
  logger.debug('Cache Operation Recorded', { operation, status });
};

/**
 * Record error metrics
 */
export const recordError = (errorType, severity = 'error') => {
  errorsTotal.inc({ type: errorType, severity });
  logger.debug('Error Recorded', { errorType, severity });
};

/**
 * Update memory usage metrics
 */
export const updateMemoryUsage = () => {
  const memoryUsage = process.memoryUsage();
  
  memoryUsageGauge.set({ type: 'rss' }, memoryUsage.rss);
  memoryUsageGauge.set({ type: 'heapTotal' }, memoryUsage.heapTotal);
  memoryUsageGauge.set({ type: 'heapUsed' }, memoryUsage.heapUsed);
  memoryUsageGauge.set({ type: 'external' }, memoryUsage.external);
  
  if (memoryUsage.arrayBuffers) {
    memoryUsageGauge.set({ type: 'arrayBuffers' }, memoryUsage.arrayBuffers);
  }
};

/**
 * Metrics endpoint handler
 */
export const metricsHandler = async (req, res) => {
  try {
    // Update memory usage before serving metrics
    updateMemoryUsage();
    
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
};

/**
 * Initialize metrics collection
 */
export const initializeMetrics = () => {
  // Update memory usage every 30 seconds
  setInterval(updateMemoryUsage, 30000);
  
  logger.info(`Metrics initialized for ${SERVICE_NAME}`);
};

/**
 * Get all metric instances for custom usage
 */
export const metrics = {
  httpRequestsTotal,
  httpRequestDuration,
  httpRequestSize,
  httpResponseSize,
  operationsTotal,
  operationDuration,
  databaseOperationsTotal,
  databaseOperationDuration,
  cacheOperationsTotal,
  cacheHitRatio,
  errorsTotal,
  activeConnectionsGauge,
  memoryUsageGauge,
  register
};

// Export register for advanced usage
export { register };
