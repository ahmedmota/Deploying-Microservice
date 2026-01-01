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
