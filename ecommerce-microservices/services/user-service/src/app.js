const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config/config');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/error.middleware');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');

// Initialize Express app
const app = express();

// Trust proxy (for rate limiting behind load balancer)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: config.app.corsOrigin,
  credentials: config.app.corsCredentials,
}));

// Compression
app.use(compression());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logger
if (config.app.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Health check
app.get(config.healthCheck.path, async (req, res) => {
  const { healthCheck: dbHealth } = require('./config/database');
  const { healthCheck: redisHealth } = require('./config/redis');

  const [db, redis] = await Promise.all([
    dbHealth(),
    redisHealth(),
  ]);

  const status = db.status === 'healthy' && redis.status === 'healthy'
    ? 'healthy'
    : 'unhealthy';

  res.status(status === 'healthy' ? 200 : 503).json({
    service: config.app.serviceName,
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: db,
      redis,
    },
  });
});

// Metrics endpoint
app.get(config.healthCheck.metricsPath, (req, res) => {
  res.json({
    service: config.app.serviceName,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
