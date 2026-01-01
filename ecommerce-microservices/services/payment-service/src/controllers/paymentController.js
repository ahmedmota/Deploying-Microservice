const { Payment } = require('../models');
const paymentGateway = require('../services/paymentGateway');
const { sendMessage } = require('../config/sqs');
const logger = require('../utils/logger');

// Process payment
exports.processPayment = async (req, res) => {
  try {
    const { orderId, userId, amount, paymentMethod, idempotencyKey } = req.body;

    // Check for duplicate request using idempotency key
    const existingPayment = await Payment.findOne({
      where: { idempotencyKey },
    });

    if (existingPayment) {
      logger.info(`Duplicate payment request detected: ${idempotencyKey}`);
      return res.json(existingPayment);
    }

    // Create payment record
    const payment = await Payment.create({
      orderId,
      userId,
      amount,
      paymentMethod,
      idempotencyKey,
      status: 'processing',
    });

    // Process payment through gateway
    const result = await paymentGateway.processPayment(amount, paymentMethod, {
      orderId,
      userId,
    });

    // Update payment status
    payment.status = result.status;
    payment.transactionId = result.transactionId || null;
    payment.failureReason = result.failureReason || null;
    payment.metadata = result;
    await payment.save();

    // Send notification
    const notificationQueueUrl = process.env.NOTIFICATION_QUEUE_URL;
    if (notificationQueueUrl && result.success) {
      await sendMessage(notificationQueueUrl, {
        type: 'payment_success',
        userId,
        orderId,
        paymentId: payment.id,
        amount,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(`Payment ${result.success ? 'completed' : 'failed'}: ${payment.id}`);
    res.status(result.success ? 201 : 400).json(payment);
  } catch (error) {
    logger.error('Error processing payment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get payment by ID
exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByPk(id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    logger.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
};

// Get payments by order ID
exports.getPaymentsByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    const payments = await Payment.findAll({
      where: { orderId },
      order: [['createdAt', 'DESC']],
    });

    res.json(payments);
  } catch (error) {
    logger.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

// Get all payments
exports.getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (userId) where.userId = userId;

    const { count, rows } = await Payment.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    res.json({
      payments: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

// Refund payment
exports.refundPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByPk(id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed payments can be refunded' });
    }

    if (payment.status === 'refunded') {
      return res.status(400).json({ error: 'Payment already refunded' });
    }

    // Process refund
    const result = await paymentGateway.refundPayment(
      payment.transactionId,
      payment.amount
    );

    if (result.success) {
      payment.status = 'refunded';
      payment.metadata = { ...payment.metadata, refund: result };
      await payment.save();

      // Send notification
      const notificationQueueUrl = process.env.NOTIFICATION_QUEUE_URL;
      if (notificationQueueUrl) {
        await sendMessage(notificationQueueUrl, {
          type: 'payment_refund',
          userId: payment.userId,
          orderId: payment.orderId,
          paymentId: payment.id,
          amount: payment.amount,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`Payment refunded: ${payment.id}`);
      res.json(payment);
    } else {
      res.status(400).json({ error: 'Refund failed', details: result });
    }
  } catch (error) {
    logger.error('Error refunding payment:', error);
    res.status(500).json({ error: 'Failed to refund payment' });
  }
};
