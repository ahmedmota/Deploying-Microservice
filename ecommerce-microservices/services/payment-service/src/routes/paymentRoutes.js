const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Validation rules
const processPaymentValidation = [
  body('orderId').isUUID(),
  body('userId').isUUID(),
  body('amount').isFloat({ min: 0.01 }),
  body('paymentMethod').isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer']),
  body('idempotencyKey').trim().notEmpty(),
];

// Routes
router.post('/', processPaymentValidation, validate, paymentController.processPayment);
router.get('/', paymentController.getAllPayments);
router.get('/:id', paymentController.getPaymentById);
router.get('/order/:orderId', paymentController.getPaymentsByOrderId);
router.post('/:id/refund', paymentController.refundPayment);

module.exports = router;
