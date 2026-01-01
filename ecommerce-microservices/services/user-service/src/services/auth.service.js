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

    // Build user name from profile or direct name field
    let name = userData.name;
    if (userData.profile && (userData.profile.firstName || userData.profile.lastName)) {
      name = `${userData.profile.firstName || ''} ${userData.profile.lastName || ''}`.trim();
    }

    // Create user
    const user = await User.create({
      email: userData.email,
      password_hash: userData.password,
      name: name || userData.email.split('@')[0],
      phone: userData.phone,
    });

    // Create profile with firstName and lastName if provided
    const profileData = {
      user_id: user.id,
    };

    if (userData.profile) {
      if (userData.profile.firstName) profileData.first_name = userData.profile.firstName;
      if (userData.profile.lastName) profileData.last_name = userData.profile.lastName;
    }

    await Profile.create(profileData);

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
