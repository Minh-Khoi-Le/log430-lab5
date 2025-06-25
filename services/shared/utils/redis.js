/**
 * Shared Redis Service
 * 
 * Provides Redis connection and utility functions for all microservices.
 * Includes connection management, key patterns, and common operations.
 * 
 * @author Log430 Lab5 Team
 * @version 1.0.0
 */

import { createClient } from 'redis';
import { logger } from './logger.js';

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10);
const SERVICE_NAME = process.env.SERVICE_NAME || 'unknown-service';

// Connection options
const redisOptions = {
  url: REDIS_URL,
  database: REDIS_DB,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      logger.error('Redis connection refused');
      return new Error('Redis server connection refused');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      logger.error('Redis retry time exhausted');
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      logger.error('Redis max retry attempts reached');
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
};

if (REDIS_PASSWORD) {
  redisOptions.password = REDIS_PASSWORD;
}

// Redis client instances
let redisClient = null;
let redisSubscriber = null;
let redisPublisher = null;
let isConnected = false;

/**
 * Redis Service Class
 */
class RedisService {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.connected = false;
    this.subscribers = new Map();
  }

  /**
   * Initialize Redis connections
   */
  async initialize() {
    try {
      // Main client for general operations
      this.client = createClient(redisOptions);
      await this.setupClientEvents(this.client, 'main');
      await this.client.connect();

      // Publisher client
      this.publisher = createClient(redisOptions);
      await this.setupClientEvents(this.publisher, 'publisher');
      await this.publisher.connect();

      // Subscriber client
      this.subscriber = createClient(redisOptions);
      await this.setupClientEvents(this.subscriber, 'subscriber');
      await this.subscriber.connect();

      this.connected = true;
      logger.info('Redis service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Redis service', { error: error.message });
      throw error;
    }
  }

  /**
   * Setup event handlers for Redis client
   */
  async setupClientEvents(client, clientType) {
    client.on('error', (err) => {
      logger.error(`Redis ${clientType} client error`, { error: err.message });
      this.connected = false;
    });

    client.on('connect', () => {
      logger.info(`Redis ${clientType} client connected`);
    });

    client.on('ready', () => {
      logger.info(`Redis ${clientType} client ready`);
      this.connected = true;
    });

    client.on('end', () => {
      logger.warn(`Redis ${clientType} client connection ended`);
      this.connected = false;
    });

    client.on('reconnecting', () => {
      logger.info(`Redis ${clientType} client reconnecting`);
    });
  }

  /**
   * Check if Redis is available
   */
  isAvailable() {
    return this.connected && this.client;
  }

  /**
   * Generate key with service prefix
   */
  generateKey(key, ...parts) {
    return [SERVICE_NAME, key, ...parts].filter(Boolean).join(':');
  }

  /**
   * Basic Redis operations
   */

  // String operations
  async get(key) {
    if (!this.isAvailable()) return null;
    
    try {
      const value = await this.client.get(this.generateKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error', { key, error: error.message });
      return null;
    }
  }

  async set(key, value, ttl = null) {
    if (!this.isAvailable()) return false;
    
    try {
      const serializedValue = JSON.stringify(value);
      const redisKey = this.generateKey(key);
      
      if (ttl) {
        await this.client.setEx(redisKey, ttl, serializedValue);
      } else {
        await this.client.set(redisKey, serializedValue);
      }
      
      return true;
    } catch (error) {
      logger.error('Redis SET error', { key, error: error.message });
      return false;
    }
  }

  async del(key) {
    if (!this.isAvailable()) return false;
    
    try {
      const result = await this.client.del(this.generateKey(key));
      return result > 0;
    } catch (error) {
      logger.error('Redis DEL error', { key, error: error.message });
      return false;
    }
  }

  async exists(key) {
    if (!this.isAvailable()) return false;
    
    try {
      const result = await this.client.exists(this.generateKey(key));
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error', { key, error: error.message });
      return false;
    }
  }

  async expire(key, ttl) {
    if (!this.isAvailable()) return false;
    
    try {
      const result = await this.client.expire(this.generateKey(key), ttl);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXPIRE error', { key, ttl, error: error.message });
      return false;
    }
  }

  async ttl(key) {
    if (!this.isAvailable()) return -1;
    
    try {
      return await this.client.ttl(this.generateKey(key));
    } catch (error) {
      logger.error('Redis TTL error', { key, error: error.message });
      return -1;
    }
  }

  // Hash operations
  async hGet(key, field) {
    if (!this.isAvailable()) return null;
    
    try {
      const value = await this.client.hGet(this.generateKey(key), field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis HGET error', { key, field, error: error.message });
      return null;
    }
  }

  async hSet(key, field, value) {
    if (!this.isAvailable()) return false;
    
    try {
      const result = await this.client.hSet(
        this.generateKey(key), 
        field, 
        JSON.stringify(value)
      );
      return result >= 0;
    } catch (error) {
      logger.error('Redis HSET error', { key, field, error: error.message });
      return false;
    }
  }

  async hGetAll(key) {
    if (!this.isAvailable()) return null;
    
    try {
      const result = await this.client.hGetAll(this.generateKey(key));
      const parsed = {};
      
      for (const [field, value] of Object.entries(result)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }
      
      return Object.keys(parsed).length > 0 ? parsed : null;
    } catch (error) {
      logger.error('Redis HGETALL error', { key, error: error.message });
      return null;
    }
  }

  async hDel(key, field) {
    if (!this.isAvailable()) return false;
    
    try {
      const result = await this.client.hDel(this.generateKey(key), field);
      return result > 0;
    } catch (error) {
      logger.error('Redis HDEL error', { key, field, error: error.message });
      return false;
    }
  }

  // List operations
  async lPush(key, ...values) {
    if (!this.isAvailable()) return false;
    
    try {
      const serializedValues = values.map(v => JSON.stringify(v));
      const result = await this.client.lPush(this.generateKey(key), serializedValues);
      return result > 0;
    } catch (error) {
      logger.error('Redis LPUSH error', { key, error: error.message });
      return false;
    }
  }

  async rPush(key, ...values) {
    if (!this.isAvailable()) return false;
    
    try {
      const serializedValues = values.map(v => JSON.stringify(v));
      const result = await this.client.rPush(this.generateKey(key), serializedValues);
      return result > 0;
    } catch (error) {
      logger.error('Redis RPUSH error', { key, error: error.message });
      return false;
    }
  }

  async lPop(key) {
    if (!this.isAvailable()) return null;
    
    try {
      const value = await this.client.lPop(this.generateKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis LPOP error', { key, error: error.message });
      return null;
    }
  }

  async rPop(key) {
    if (!this.isAvailable()) return null;
    
    try {
      const value = await this.client.rPop(this.generateKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis RPOP error', { key, error: error.message });
      return null;
    }
  }

  async lRange(key, start = 0, stop = -1) {
    if (!this.isAvailable()) return [];
    
    try {
      const values = await this.client.lRange(this.generateKey(key), start, stop);
      return values.map(v => {
        try {
          return JSON.parse(v);
        } catch {
          return v;
        }
      });
    } catch (error) {
      logger.error('Redis LRANGE error', { key, start, stop, error: error.message });
      return [];
    }
  }

  // Set operations
  async sAdd(key, ...members) {
    if (!this.isAvailable()) return false;
    
    try {
      const serializedMembers = members.map(m => JSON.stringify(m));
      const result = await this.client.sAdd(this.generateKey(key), serializedMembers);
      return result > 0;
    } catch (error) {
      logger.error('Redis SADD error', { key, error: error.message });
      return false;
    }
  }

  async sMembers(key) {
    if (!this.isAvailable()) return [];
    
    try {
      const members = await this.client.sMembers(this.generateKey(key));
      return members.map(m => {
        try {
          return JSON.parse(m);
        } catch {
          return m;
        }
      });
    } catch (error) {
      logger.error('Redis SMEMBERS error', { key, error: error.message });
      return [];
    }
  }

  async sRem(key, ...members) {
    if (!this.isAvailable()) return false;
    
    try {
      const serializedMembers = members.map(m => JSON.stringify(m));
      const result = await this.client.sRem(this.generateKey(key), serializedMembers);
      return result > 0;
    } catch (error) {
      logger.error('Redis SREM error', { key, error: error.message });
      return false;
    }
  }

  // Pub/Sub operations
  async publish(channel, message) {
    if (!this.isAvailable()) return false;
    
    try {
      const channelKey = this.generateKey('channel', channel);
      const result = await this.publisher.publish(channelKey, JSON.stringify(message));
      return result > 0;
    } catch (error) {
      logger.error('Redis PUBLISH error', { channel, error: error.message });
      return false;
    }
  }

  async subscribe(channel, callback) {
    if (!this.isAvailable()) return false;
    
    try {
      const channelKey = this.generateKey('channel', channel);
      
      await this.subscriber.subscribe(channelKey, (message) => {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          logger.error('Error parsing subscribed message', { 
            channel, 
            message, 
            error: error.message 
          });
        }
      });
      
      this.subscribers.set(channel, callback);
      logger.info('Subscribed to Redis channel', { channel: channelKey });
      return true;
    } catch (error) {
      logger.error('Redis SUBSCRIBE error', { channel, error: error.message });
      return false;
    }
  }

  async unsubscribe(channel) {
    if (!this.isAvailable()) return false;
    
    try {
      const channelKey = this.generateKey('channel', channel);
      await this.subscriber.unsubscribe(channelKey);
      this.subscribers.delete(channel);
      logger.info('Unsubscribed from Redis channel', { channel: channelKey });
      return true;
    } catch (error) {
      logger.error('Redis UNSUBSCRIBE error', { channel, error: error.message });
      return false;
    }
  }

  // Utility operations
  async keys(pattern) {
    if (!this.isAvailable()) return [];
    
    try {
      const searchPattern = this.generateKey(pattern);
      return await this.client.keys(searchPattern);
    } catch (error) {
      logger.error('Redis KEYS error', { pattern, error: error.message });
      return [];
    }
  }

  async flushService() {
    if (!this.isAvailable()) return false;
    
    try {
      const keys = await this.keys('*');
      if (keys.length > 0) {
        const result = await this.client.del(keys);
        logger.info('Flushed service Redis keys', { count: result });
        return result > 0;
      }
      return true;
    } catch (error) {
      logger.error('Redis flush service error', { error: error.message });
      return false;
    }
  }

  async ping() {
    if (!this.isAvailable()) return false;
    
    try {
      const response = await this.client.ping();
      return response === 'PONG';
    } catch (error) {
      logger.error('Redis PING error', { error: error.message });
      return false;
    }
  }

  /**
   * Close all Redis connections
   */
  async close() {
    const closePromises = [];
    
    if (this.client) {
      closePromises.push(this.client.quit());
    }
    
    if (this.publisher) {
      closePromises.push(this.publisher.quit());
    }
    
    if (this.subscriber) {
      closePromises.push(this.subscriber.quit());
    }
    
    try {
      await Promise.all(closePromises);
      logger.info('Redis service closed successfully');
    } catch (error) {
      logger.error('Error closing Redis service', { error: error.message });
    }
  }
}

// Create singleton instance
const redisService = new RedisService();

// Export singleton instance and class
export { redisService, RedisService };
export default redisService;
