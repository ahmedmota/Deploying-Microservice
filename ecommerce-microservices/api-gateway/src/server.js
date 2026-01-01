require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 8080;

let server;

const startServer = async () => {
  try {
    // Start server
    server = app.listen(PORT, () => {
      logger.info(`API Gateway running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('Service routes configured:');
      logger.info('  - /api/auth -> User Service');
      logger.info('  - /api/users -> User Service');
      logger.info('  - /api/products -> Product Service');
      logger.info('  - /api/categories -> Product Service');
      logger.info('  - /api/orders -> Order Service');
      logger.info('  - /api/payments -> Payment Service');
      logger.info('  - /api/notifications -> Notification Service');
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
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  }
};

startServer();
