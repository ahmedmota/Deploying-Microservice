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
