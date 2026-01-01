const { APIError } = require('../utils/errors');
const logger = require('../utils/logger');
const config = require('../config/config');

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Log error
  logger.logError(error, req);

  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    error = {
      statusCode: 422,
      message: 'Validation error',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message,
      })),
    };
  }

  // Handle Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    error = {
      statusCode: 409,
      message: 'Resource already exists',
      errors: err.errors.map(e => ({
        field: e.path,
        message: `${e.path} already exists`,
      })),
    };
  }

  // Handle API errors
  if (error instanceof APIError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.statusCode,
        ...(error.errors && { errors: error.errors }),
        ...(config.app.env === 'development' && { stack: error.stack }),
      },
    });
  }

  // Handle unknown errors
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: statusCode,
      ...(config.app.env === 'development' && { stack: error.stack }),
    },
  });
};

/**
 * 404 handler
 */
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 404,
      path: req.originalUrl,
    },
  });
};

module.exports = {
  errorHandler,
  notFound,
};
