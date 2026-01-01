const app = require('./app');
const config = require('./config/config');
const logger = require('./utils/logger');
const { testConnection, closeConnection } = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await testConnection();

    // Load models before syncing
    require('./models/user.model');
    require('./models/profile.model');

    // Sync database models (create tables if they don't exist)
    const { sequelize } = require('./config/database');
    await sequelize.sync({ alter: config.app.env === 'development' });
    logger.info('✅ Database models synchronized');

    // Connect to Redis
    await connectRedis();

    // Start Express server
    const server = app.listen(config.app.port, () => {
      logger.info(`🚀 ${config.app.serviceName} running on port ${config.app.port}`);
      logger.info(`Environment: ${config.app.env}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        // Close database connection
        await closeConnection();

        // Close Redis connection
        await disconnectRedis();

        logger.info('All connections closed');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
