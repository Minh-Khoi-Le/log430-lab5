/**
 * Shared Health Check Middleware
 * 
 * Provides a standard health check endpoint for all microservices.
 * Responds with service status, timestamp, and dependencies.
 * 
 * @author Log430 Lab5 Team
 * @version 1.0.0
 */

import { getDatabaseClient } from '../database/index.js';
import { getRedisClient } from './redis.js';

/**
 * Health Check Middleware
 * 
 * @param {string} serviceName - Name of the service
 * @param {Array<string>} dependencies - List of service dependencies (e.g., ['database', 'redis'])
 * @returns {Function} Express middleware function
 */
export function healthCheck(serviceName, dependencies = []) {
  return async (req, res) => {
    const health = {
      service: serviceName,
      status: 'UP',
      timestamp: new Date().toISOString(),
      dependencies: {}
    };

    let isHealthy = true;

    // Check database connection
    if (dependencies.includes('database')) {
      try {
        const prisma = getDatabaseClient();
        await prisma.$queryRaw`SELECT 1`;
        health.dependencies.database = 'UP';
      } catch (error) {
        health.dependencies.database = 'DOWN';
        health.status = 'DOWN';
        isHealthy = false;
      }
    }

    // Check Redis connection
    if (dependencies.includes('redis')) {
      try {
        const redis = getRedisClient();
        await redis.ping();
        health.dependencies.redis = 'UP';
      } catch (error) {
        health.dependencies.redis = 'DOWN';
        health.status = 'DOWN';
        isHealthy = false;
      }
    }

    res.status(isHealthy ? 200 : 503).json(health);
  };
}
