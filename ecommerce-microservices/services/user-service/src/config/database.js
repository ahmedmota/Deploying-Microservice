const { Sequelize } = require('sequelize');
const config = require('./config');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// Configure SSL options for database connection
const getSSLConfig = () => {
  const sslEnabled = process.env.DB_SSL === 'true';

  if (!sslEnabled) {
    logger.info('Database SSL is disabled');
    return false;
  }

  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
  const caPath = process.env.DB_SSL_CA_PATH;

  let ca;
  if (caPath) {
    if (fs.existsSync(caPath)) {
      ca = fs.readFileSync(caPath).toString();
      logger.info(`Database SSL enabled with CA certificate from: ${caPath}`);
    } else {
      logger.warn(`⚠️  Database SSL CA certificate not found at: ${caPath}`);
    }
  } else {
    logger.warn('⚠️  Database SSL enabled but no CA certificate path provided (DB_SSL_CA_PATH)');
    if (rejectUnauthorized) {
      logger.warn('⚠️  Connection may fail with rejectUnauthorized=true and no certificate');
      logger.warn('   Set DB_SSL_REJECT_UNAUTHORIZED=false to bypass certificate verification (less secure)');
    }
  }

  return {
    require: true,
    rejectUnauthorized,
    ca,
  };
};

// Initialize Sequelize with PostgreSQL
const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    pool: config.database.pool,
    logging: config.database.logging,
    dialectOptions: {
      statement_timeout: 30000, // 30 seconds
      idle_in_transaction_session_timeout: 60000, // 60 seconds
      ssl: getSSLConfig(),
    },
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully');
    return true;
  } catch (error) {
    logger.error('❌ Unable to connect to database:', error);
    throw error;
  }
};

// Close database connection gracefully
const closeConnection = async () => {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

// Health check for database
const healthCheck = async () => {
  try {
    await sequelize.authenticate();
    return { status: 'healthy', message: 'Database connection is active' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
};

module.exports = {
  sequelize,
  testConnection,
  closeConnection,
  healthCheck,
};
