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
