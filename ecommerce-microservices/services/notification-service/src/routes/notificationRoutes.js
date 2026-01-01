const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Validation rules
const createNotificationValidation = [
  body('userId').isUUID(),
  body('type').isIn([
    'order_confirmation',
    'payment_success',
    'payment_failed',
    'order_shipped',
    'order_delivered',
    'payment_refund',
    'account_created',
    'password_reset'
  ]),
  body('channel').isIn(['email', 'sms', 'push']),
  body('recipient').trim().notEmpty(),
  body('data').optional().isObject(),
];

// Routes
router.post('/', createNotificationValidation, validate, notificationController.createNotification);
router.get('/', notificationController.getAllNotifications);
router.get('/:id', notificationController.getNotificationById);
router.get('/user/:userId', notificationController.getNotificationsByUserId);

module.exports = router;
