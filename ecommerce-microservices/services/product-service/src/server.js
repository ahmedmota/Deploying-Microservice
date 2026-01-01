require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3002;

let server;

const startServer = async () => {
  try {
    // Connect to database and Redis
    await connectDB();
    await connectRedis();

    // Start server
    server = app.listen(PORT, () => {
      logger.info(`Product Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, closing server gracefully...');

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        const { sequelize } = require('./config/database');
        const { redisClient } = require('./config/redis');

        await sequelize.close();
        await redisClient.quit();

        logger.info('Database and Redis connections closed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  }
};

startServer();
