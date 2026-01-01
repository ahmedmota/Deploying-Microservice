const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Validation rules
const createOrderValidation = [
  body('userId').isUUID(),
  body('items').isArray({ min: 1 }),
  body('items.*.productId').isUUID(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('shippingAddress').isObject(),
  body('shippingAddress.street').trim().notEmpty(),
  body('shippingAddress.city').trim().notEmpty(),
  body('shippingAddress.country').trim().notEmpty(),
  body('shippingAddress.postalCode').trim().notEmpty(),
];

const updateStatusValidation = [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
];

// Routes
router.post('/', createOrderValidation, validate, orderController.createOrder);
router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.patch('/:id/status', updateStatusValidation, validate, orderController.updateOrderStatus);
router.post('/:id/cancel', orderController.cancelOrder);

module.exports = router;
