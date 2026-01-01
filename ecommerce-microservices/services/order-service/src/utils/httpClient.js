const axios = require('axios');
const logger = require('./logger');

// Create axios instance with default config
const httpClient = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
httpClient.interceptors.request.use(
  (config) => {
    logger.debug(`HTTP Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    logger.error('HTTP Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
httpClient.interceptors.response.use(
  (response) => {
    logger.debug(`HTTP Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      logger.error(`HTTP Error: ${error.response.status} ${error.config.url}`);
    } else {
      logger.error('HTTP Error:', error.message);
    }
    return Promise.reject(error);
  }
);

module.exports = httpClient;
