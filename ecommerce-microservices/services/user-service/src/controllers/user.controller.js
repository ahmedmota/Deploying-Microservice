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
