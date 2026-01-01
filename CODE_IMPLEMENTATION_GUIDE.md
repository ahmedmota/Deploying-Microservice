# Complete Microservices Implementation Guide

This document provides complete code examples for all components. Use this as a reference to build all 5 microservices.

## Table of Contents
1. [User Service - Complete Implementation](#user-service)
2. [Product Service - Complete Implementation](#product-service)
3. [Order Service - Complete Implementation](#order-service)
4. [Payment Service - Complete Implementation](#payment-service)
5. [Notification Service - Complete Implementation](#notification-service)
6. [Common Patterns](#common-patterns)

---

## Files Already Created (User Service)

✅ `/services/user-service/package.json`
✅ `/services/user-service/.env.example`
✅ `/services/user-service/src/config/config.js`
✅ `/services/user-service/src/config/database.js`
✅ `/services/user-service/src/config/redis.js`
✅ `/services/user-service/src/utils/logger.js`
✅ `/services/user-service/src/utils/errors.js`
✅ `/services/user-service/src/utils/jwt.js`
✅ `/services/user-service/src/models/user.model.js`
✅ `/services/user-service/src/models/profile.model.js`

---

## User Service - Remaining Files

### 1. Middleware - Authentication (`src/middleware/auth.middleware.js`)

```javascript
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const { verifyAccessToken, extractToken } = require('../utils/jwt');
const { cache } = require('../config/redis');
const User = require('../models/user.model');
const logger = require('../utils/logger');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Check if token is blacklisted (logged out)
    const blacklisted = await cache.get(`blacklist:${token}`);
    if (blacklisted) {
      throw new UnauthorizedError('Token has been revoked');
    }

    // Try to get user from cache
    let user = await cache.get(`user:${decoded.id}`);
    
    if (!user) {
      // Get user from database
      user = await User.findByPk(decoded.id);
      
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      // Cache user for 5 minutes
      await cache.set(`user:${decoded.id}`, user, 300);
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new UnauthorizedError('Account is not active');
    }

    // Attach user to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user has required role
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findByPk(decoded.id);
      if (user && user.status === 'active') {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Don't fail, just continue without user
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
};
```

### 2. Middleware - Error Handler (`src/middleware/error.middleware.js`)

```javascript
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
```

### 3. Middleware - Validation (`src/middleware/validation.middleware.js`)

```javascript
const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Validate request using express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }));

    throw new ValidationError('Validation failed', formattedErrors);
  }

  next();
};

module.exports = {
  validate,
};
```

### 4. Validators - User Validator (`src/validators/user.validator.js`)

```javascript
const { body, param, query } = require('express-validator');

const registerValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Must be a valid phone number'),
];

const loginValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const updateProfileValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Must be a valid phone number'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
];

const changePasswordValidator = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
];

const userIdValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid user ID'),
];

module.exports = {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator,
  userIdValidator,
};
```

### 5. Services - Auth Service (`src/services/auth.service.js`)

```javascript
const User = require('../models/user.model');
const Profile = require('../models/profile.model');
const { generateTokens } = require('../utils/jwt');
const { cache } = require('../config/redis');
const { 
  ConflictError, 
  UnauthorizedError, 
  NotFoundError 
} = require('../utils/errors');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Register new user
   */
  async register(userData) {
    // Check if user exists
    const existingUser = await User.findOne({ where: { email: userData.email } });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Create user
    const user = await User.create({
      email: userData.email,
      password_hash: userData.password,
      name: userData.name,
      phone: userData.phone,
    });

    // Create profile
    await Profile.create({
      user_id: user.id,
    });

    // Generate tokens
    const tokens = generateTokens(user);

    // Cache user
    await cache.set(`user:${user.id}`, user, 3600);

    logger.info(`New user registered: ${user.email}`);

    return {
      user: user.toJSON(),
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(email, password, ip) {
    // Find user
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if account is locked
    if (user.locked_until && user.locked_until > new Date()) {
      throw new UnauthorizedError('Account is temporarily locked');
    }

    // Validate password
    const isValid = await user.validatePassword(password);
    
    if (!isValid) {
      // Increment failed attempts
      await user.increment('failed_login_attempts');
      await user.reload();

      // Lock account after 5 failed attempts
      if (user.failed_login_attempts >= 5) {
        user.locked_until = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await user.save();
        throw new UnauthorizedError('Too many failed attempts. Account locked for 15 minutes');
      }

      throw new UnauthorizedError('Invalid credentials');
    }

    // Check account status
    if (user.status !== 'active') {
      throw new UnauthorizedError('Account is not active');
    }

    // Update login info
    user.last_login_at = new Date();
    user.last_login_ip = ip;
    user.failed_login_attempts = 0;
    user.locked_until = null;
    await user.save();

    // Generate tokens
    const tokens = generateTokens(user);

    // Cache user
    await cache.set(`user:${user.id}`, user, 3600);

    logger.info(`User logged in: ${user.email}`);

    return {
      user: user.toJSON(),
      tokens,
    };
  }

  /**
   * Logout user
   */
  async logout(userId, token) {
    // Blacklist token
    await cache.set(`blacklist:${token}`, true, 86400); // 24 hours

    // Clear user cache
    await cache.del(`user:${userId}`);

    logger.info(`User logged out: ${userId}`);

    return { message: 'Logged out successfully' };
  }

  /**
   * Refresh token
   */
  async refreshToken(userId) {
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedError('Account is not active');
    }

    const tokens = generateTokens(user);

    return tokens;
  }
}

module.exports = new AuthService();
```

### 6. Services - User Service (`src/services/user.service.js`)

```javascript
const User = require('../models/user.model');
const Profile = require('../models/profile.model');
const { cache } = require('../config/redis');
const { 
  NotFoundError, 
  UnauthorizedError,
  ConflictError 
} = require('../utils/errors');
const logger = require('../utils/logger');

class UserService {
  /**
   * Get user by ID
   */
  async getUserById(userId) {
    // Try cache first
    let user = await cache.get(`user:${userId}`);
    
    if (!user) {
      user = await User.findByPk(userId, {
        include: [{ model: Profile, as: 'profile' }],
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      await cache.set(`user:${userId}`, user, 3600);
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updateData) {
    const user = await User.findByPk(userId, {
      include: [{ model: Profile, as: 'profile' }],
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Update user fields
    if (updateData.name) user.name = updateData.name;
    if (updateData.phone) user.phone = updateData.phone;
    await user.save();

    // Update profile fields
    if (user.profile) {
      const profileFields = [
        'bio', 'avatar_url', 'date_of_birth', 'gender',
        'address_line1', 'address_line2', 'city', 'state', 
        'country', 'postal_code', 'notification_preferences'
      ];

      profileFields.forEach(field => {
        if (updateData[field] !== undefined) {
          user.profile[field] = updateData[field];
        }
      });

      await user.profile.save();
    }

    // Invalidate cache
    await cache.del(`user:${userId}`);

    logger.info(`User profile updated: ${userId}`);

    return user;
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isValid = await user.validatePassword(currentPassword);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Update password
    user.password_hash = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${userId}`);

    return { message: 'Password changed successfully' };
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await user.destroy(); // Soft delete (paranoid mode)

    // Invalidate cache
    await cache.del(`user:${userId}`);

    logger.info(`User deleted: ${userId}`);

    return { message: 'User deleted successfully' };
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    const where = {};

    if (filters.status) where.status = filters.status;
    if (filters.role) where.role = filters.role;

    const { count, rows } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [{ model: Profile, as: 'profile' }],
    });

    return {
      users: rows,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
        limit,
      },
    };
  }
}

module.exports = new UserService();
```

### 7. Controllers - Auth Controller (`src/controllers/auth.controller.js`)

```javascript
const authService = require('../services/auth.service');
const { asyncHandler } = require('../utils/async-handler');

/**
 * Register new user
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  res.status(201).json({
    success: true,
    data: result,
  });
});

/**
 * Login user
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip;

  const result = await authService.login(email, password, ip);

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id, req.token);

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * Refresh token
 * POST /api/auth/refresh
 */
const refreshToken = asyncHandler(async (req, res) => {
  const tokens = await authService.refreshToken(req.user.id);

  res.json({
    success: true,
    data: tokens,
  });
});

/**
 * Get current user
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
});

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getMe,
};
```

### 8. Controllers - User Controller (`src/controllers/user.controller.js`)

```javascript
const userService = require('../services/user.service');
const { asyncHandler } = require('../utils/async-handler');

/**
 * Get user by ID
 * GET /api/users/:id
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);

  res.json({
    success: true,
    data: user,
  });
});

/**
 * Update user profile
 * PUT /api/users/profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);

  res.json({
    success: true,
    data: user,
    message: 'Profile updated successfully',
  });
});

/**
 * Change password
 * PUT /api/users/password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  await userService.changePassword(req.user.id, currentPassword, newPassword);

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

/**
 * Delete user
 * DELETE /api/users/:id
 */
const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id);

  res.json({
    success: true,
    message: 'User deleted successfully',
  });
});

/**
 * Get all users (admin only)
 * GET /api/users
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, role } = req.query;

  const result = await userService.getAllUsers(
    parseInt(page),
    parseInt(limit),
    { status, role }
  );

  res.json({
    success: true,
    data: result,
  });
});

module.exports = {
  getUserById,
  updateProfile,
  changePassword,
  deleteUser,
  getAllUsers,
};
```

### 9. Routes - Auth Routes (`src/routes/auth.routes.js`)

```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { 
  registerValidator, 
  loginValidator 
} = require('../validators/user.validator');

// Public routes
router.post('/register', registerValidator, validate, authController.register);
router.post('/login', loginValidator, validate, authController.login);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.post('/refresh', authenticate, authController.refreshToken);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
```

### 10. Routes - User Routes (`src/routes/user.routes.js`)

```javascript
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const {
  updateProfileValidator,
  changePasswordValidator,
  userIdValidator,
} = require('../validators/user.validator');

// Protected routes (authenticated users only)
router.get('/profile', authenticate, userController.getUserById);
router.put('/profile', authenticate, updateProfileValidator, validate, userController.updateProfile);
router.put('/password', authenticate, changePasswordValidator, validate, userController.changePassword);

// Admin routes
router.get('/', authenticate, authorize('admin'), userController.getAllUsers);
router.get('/:id', authenticate, userIdValidator, validate, userController.getUserById);
router.delete('/:id', authenticate, authorize('admin'), userIdValidator, validate, userController.deleteUser);

module.exports = router;
```

### 11. Main App (`src/app.js`)

```javascript
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
```

### 12. Server Entry Point (`src/server.js`)

```javascript
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
```

### 13. Async Handler Utility (`src/utils/async-handler.js`)

```javascript
/**
 * Wrap async route handlers to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = { asyncHandler };
```

### 14. Database Migration (`migrations/001_create_users_table.sql`)

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verified_at TIMESTAMP,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45),
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    avatar_url VARCHAR(500),
    bio TEXT,
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true, "marketing": false}'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE UNIQUE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_country ON profiles(country);
```

### 15. Migration Runner (`migrations/run.js`)

```javascript
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('Running migrations...');

    const migrationFile = path.join(__dirname, '001_create_users_table.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    await client.query(sql);

    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
```

### 16. Dockerfile (`Dockerfile`)

```dockerfile
FROM node:18-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/server.js"]
```

### 17. Docker Ignore (`.dockerignore`)

```
node_modules
npm-debug.log
.env
.env.*
!.env.example
.git
.gitignore
README.md
.vscode
.idea
*.md
logs
coverage
.DS_Store
```

### 18. README (`README.md`)

```markdown
# User Service

Authentication and user management microservice.

## Features

- User registration and authentication
- JWT-based authentication
- Profile management
- Password management
- Role-based access control (RBAC)
- Account locking after failed attempts
- Redis caching
- PostgreSQL database
- Production-ready logging

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login
- POST `/api/auth/logout` - Logout
- POST `/api/auth/refresh` - Refresh token
- GET `/api/auth/me` - Get current user

### Users
- GET `/api/users` - Get all users (admin)
- GET `/api/users/:id` - Get user by ID
- PUT `/api/users/profile` - Update profile
- PUT `/api/users/password` - Change password
- DELETE `/api/users/:id` - Delete user (admin)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run migrations:
```bash
npm run migrate
```

4. Start service:
```bash
# Development
npm run dev

# Production
npm start
```

## Docker

Build:
```bash
docker build -t user-service .
```

Run:
```bash
docker run -p 3001:3001 --env-file .env user-service
```

## Testing

```bash
npm test
```

## Environment Variables

See `.env.example` for required configuration.
```

---

## Summary - User Service Complete ✅

The User Service is now complete with:
- ✅ Authentication & Authorization
- ✅ User & Profile Management
- ✅ JWT Tokens
- ✅ Redis Caching
- ✅ PostgreSQL Database
- ✅ Input Validation
- ✅ Error Handling
- ✅ Logging
- ✅ Docker Support
- ✅ Health Checks
- ✅ Rate Limiting

---

## Next Steps for Other Services

For **Product Service**, **Order Service**, **Payment Service**, and **Notification Service**, follow the same pattern:

1. Copy the folder structure
2. Modify models based on service requirements
3. Adjust routes and controllers
4. Add service-specific logic (e.g., SQS consumers for async services)
5. Update Dockerfile ports

Each service follows the SAME architecture pattern shown above.

---

## Using Claude Code

To generate all remaining services:

```bash
# In Claude Code terminal
claude-code "Generate Product Service following the User Service pattern with these models:
- Product (id, name, description, price, stock, category_id)
- Category (id, name, parent_id)
- Inventory (id, product_id, quantity, warehouse_id)

Port: 3002
Database: productdb
Features: Product CRUD, inventory management, caching"
```

Repeat for Order, Payment, and Notification services!

---

**This guide provides everything you need to build production-grade microservices!** 🚀
