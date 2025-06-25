import promClient from 'prom-client';
import expressPromBundle from 'express-prom-bundle';
import os from 'os';

// Get hostname for pod identification
const HOSTNAME = os.hostname();

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'log430-server',
  pod: HOSTNAME
});

// We'll let express-prom-bundle collect the default metrics instead
// promClient.collectDefaultMetrics({ register });

// Define custom metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
});

// Product operation metrics
const productOperations = new promClient.Counter({
  name: 'product_operations_total',
  help: 'Count of product operations',
  labelNames: ['operation', 'status']
});

// Request counter with pod information
const requestsCounter = new promClient.Counter({
  name: 'requests_total_by_pod',
  help: 'Counter for requests by pod',
  labelNames: ['pod', 'path']
});

// Register the custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(productOperations);
register.registerMetric(requestsCounter);

// Create the middleware for express
const metricsMiddleware = expressPromBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { project: 'log430' },
  promClient: {
    collectDefaultMetrics: {}
  },
  promRegistry: register
});

// Pod identification middleware
const podIdentifier = (req, res, next) => {
  // Add pod identifier to response headers
  res.setHeader('X-Serving-Pod', HOSTNAME);
  
  // Increment pod-specific request counter
  requestsCounter.inc({ pod: HOSTNAME, path: req.path });
  
  next();
};

// Expose metrics endpoint for Prometheus to scrape
const metricsEndpoint = (app) => {
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (ex) {
      res.status(500).end(ex);
    }
  });
};

export { metricsMiddleware, metricsEndpoint, podIdentifier, register, productOperations }; 