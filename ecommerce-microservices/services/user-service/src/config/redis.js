const redis = require('redis');
const config = require('./config');
const logger = require('../utils/logger');

// Create Redis client
const redisClient = redis.createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis max reconnection attempts reached');
        return new Error('Redis max reconnection attempts reached');
      }
      // Exponential backoff: 2^retries * 100ms
      const delay = Math.min(Math.pow(2, retries) * 100, 3000);
      logger.info(`Redis reconnecting in ${delay}ms...`);
      return delay;
    },
  },
  password: config.redis.password,
  database: config.redis.db,
});

// Event handlers
redisClient.on('connect', () => {
  logger.info('✅ Redis client connecting...');
});

redisClient.on('ready', () => {
  logger.info('✅ Redis client connected and ready');
});

redisClient.on('error', (err) => {
  logger.error('❌ Redis client error:', err);
});

redisClient.on('end', () => {
  logger.info('Redis client disconnected');
});

// Connect to Redis
const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    return true;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

// Disconnect from Redis
const disconnectRedis = async () => {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      logger.info('Redis connection closed gracefully');
    }
  } catch (error) {
    logger.error('Error disconnecting Redis:', error);
    await redisClient.disconnect(); // Force disconnect
  }
};

// Cache helper functions
const cacheHelpers = {
  // Set value with TTL
  set: async (key, value, ttl = config.redis.ttl) => {
    try {
      const serialized = JSON.stringify(value);
      await redisClient.setEx(key, ttl, serialized);
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  },

  // Get value
  get: async (key) => {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  },

  // Delete value
  del: async (key) => {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  },

  // Delete pattern
  delPattern: async (pattern) => {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Redis DEL pattern error:', error);
      return false;
    }
  },

  // Check if key exists
  exists: async (key) => {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  },

  // Set hash
  hSet: async (key, field, value) => {
    try {
      await redisClient.hSet(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis HSET error:', error);
      return false;
    }
  },

  // Get hash
  hGet: async (key, field) => {
    try {
      const value = await redisClient.hGet(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis HGET error:', error);
      return null;
    }
  },

  // Get all hash fields
  hGetAll: async (key) => {
    try {
      const data = await redisClient.hGetAll(key);
      const parsed = {};
      for (const [field, value] of Object.entries(data)) {
        parsed[field] = JSON.parse(value);
      }
      return parsed;
    } catch (error) {
      logger.error('Redis HGETALL error:', error);
      return null;
    }
  },
};

// Health check
const healthCheck = async () => {
  try {
    await redisClient.ping();
    return { status: 'healthy', message: 'Redis connection is active' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
};

module.exports = {
  redisClient,
  connectRedis,
  disconnectRedis,
  cache: cacheHelpers,
  healthCheck,
};
