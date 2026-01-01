const { createProxyMiddleware } = require('http-proxy-middleware');
const logger = require('../utils/logger');

const createProxy = (target, pathRewrite = {}) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    timeout: 60000, // 60 seconds
    proxyTimeout: 60000,
    onProxyReq: (proxyReq, req, res) => {
      logger.info(`Proxying ${req.method} ${req.url} to ${target}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      logger.info(`Received ${proxyRes.statusCode} from ${target}`);
    },
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${req.url}:`, err.message);
      if (!res.headersSent) {
        res.status(503).json({
          error: 'Service temporarily unavailable',
          message: err.message,
        });
      }
    },
  });
};

module.exports = { createProxy };
