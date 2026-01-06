const redis = require('redis');
const logger = require('../utils/logger');

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    connectTimeout: 10000, // 10 second timeout
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        logger.error('Redis max reconnection attempts reached');
        return new Error('Max reconnection attempts reached');
      }
      return Math.min(retries * 100, 3000);
    },
  },
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DB) || 1,
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis connected successfully');
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis reconnecting...');
});

const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      logger.info('Redis connection established');
    } else {
      logger.info('Redis already connected');
    }
  } catch (error) {
    logger.error('Redis connection failed:', error);
    logger.warn('Service will continue without Redis cache');
    // Don't exit, allow service to run without cache
  }
};

module.exports = { redisClient, connectRedis };
