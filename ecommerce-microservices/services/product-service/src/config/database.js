const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
const fs = require('fs');

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

const sequelize = new Sequelize(
  process.env.DB_NAME || 'product_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      min: parseInt(process.env.DB_POOL_MIN) || 5,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
    },
    dialectOptions: {
      ssl: getSSLConfig(),
    },
    define: {
      underscored: true,
      timestamps: true,
      paranoid: true,
    },
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('PostgreSQL connected successfully');

    // Sync database tables (creates if they don't exist)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('Database synchronized');
  } catch (error) {
    logger.error('Unable to connect to database:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
