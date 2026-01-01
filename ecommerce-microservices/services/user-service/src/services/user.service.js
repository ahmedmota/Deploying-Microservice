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
