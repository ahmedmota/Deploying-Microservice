const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Mock payment gateway
class PaymentGateway {
  constructor() {
    this.apiKey = process.env.PAYMENT_GATEWAY_API_KEY || 'test_key';
  }

  async processPayment(amount, paymentMethod, metadata = {}) {
    logger.info(`Processing payment: ${amount} via ${paymentMethod}`);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock payment processing (90% success rate)
    const success = Math.random() > 0.1;

    if (success) {
      const transactionId = `txn_${uuidv4()}`;
      logger.info(`Payment successful: ${transactionId}`);

      return {
        success: true,
        transactionId,
        status: 'completed',
        processedAt: new Date().toISOString(),
      };
    } else {
      logger.error('Payment failed: Insufficient funds');

      return {
        success: false,
        status: 'failed',
        error: 'Insufficient funds',
        failureReason: 'Payment declined by issuer',
      };
    }
  }

  async refundPayment(transactionId, amount) {
    logger.info(`Refunding payment: ${transactionId} - ${amount}`);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock refund processing (95% success rate)
    const success = Math.random() > 0.05;

    if (success) {
      const refundId = `ref_${uuidv4()}`;
      logger.info(`Refund successful: ${refundId}`);

      return {
        success: true,
        refundId,
        status: 'refunded',
        refundedAt: new Date().toISOString(),
      };
    } else {
      logger.error('Refund failed');

      return {
        success: false,
        status: 'failed',
        error: 'Refund processing error',
      };
    }
  }
}

module.exports = new PaymentGateway();
