const AWS = require('aws-sdk');
const logger = require('../utils/logger');
const Payment = require('../models/Payment');
const { processOrderPayment } = require('../services/paymentGateway');

const sqs = new AWS.SQS({
  region: process.env.AWS_REGION || 'ap-southeast-1'
});

const ORDER_QUEUE_URL = process.env.ORDER_QUEUE_URL;
const PAYMENT_QUEUE_URL = process.env.PAYMENT_QUEUE_URL;
const NOTIFICATION_QUEUE_URL = process.env.NOTIFICATION_QUEUE_URL;

let isPolling = false;
let pollInterval = null;

/**
 * Poll messages from Order Queue
 */
async function pollMessages() {
  if (!ORDER_QUEUE_URL) {
    logger.error('ORDER_QUEUE_URL not configured');
    return;
  }

  if (isPolling) {
    return; // Prevent multiple polling instances
  }

  isPolling = true;

  const params = {
    QueueUrl: ORDER_QUEUE_URL,
    MaxNumberOfMessages: 10, // Process up to 10 messages at once
    WaitTimeSeconds: 20, // Long polling
    VisibilityTimeout: 300, // 5 minutes to process
    MessageAttributeNames: ['All'],
    AttributeNames: ['All']
  };

  try {
    const data = await sqs.receiveMessage(params).promise();

    if (data.Messages && data.Messages.length > 0) {
      logger.info(`Received ${data.Messages.length} messages from order queue`);

      // Process messages in parallel
      await Promise.all(
        data.Messages.map(message => processMessage(message))
      );
    }
  } catch (error) {
    logger.error('Error polling messages from SQS:', error);
  } finally {
    isPolling = false;
  }

  // Continue polling
  setImmediate(pollMessages);
}

/**
 * Process individual message
 */
async function processMessage(message) {
  const startTime = Date.now();

  try {
    logger.info(`Processing message: ${message.MessageId}`);

    // Parse message body
    const orderData = JSON.parse(message.Body);

    // Validate message
    if (!orderData.orderId || !orderData.totalAmount) {
      throw new Error('Invalid order data in message');
    }

    // Process payment for the order
    const paymentResult = await processOrderPayment({
      orderId: orderData.orderId,
      userId: orderData.userId,
      amount: orderData.totalAmount,
      currency: orderData.currency || 'USD',
      paymentMethod: orderData.paymentMethod || 'card',
      items: orderData.items
    });

    // Send payment status to payment queue (FIFO)
    if (PAYMENT_QUEUE_URL) {
      await sendPaymentNotification(paymentResult, orderData);
    }

    // Send notification to notification queue
    if (NOTIFICATION_QUEUE_URL) {
      await sendNotificationMessage(paymentResult, orderData);
    }

    // Delete message from queue (success)
    await deleteMessage(message.ReceiptHandle);

    const processingTime = Date.now() - startTime;
    logger.info(`Successfully processed order ${orderData.orderId} in ${processingTime}ms`);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Error processing message ${message.MessageId} after ${processingTime}ms:`, error);

    // Check if error is retryable
    if (isRetryableError(error)) {
      logger.warn('Retryable error - message will be retried');
      // Don't delete message - it will return to queue after visibility timeout
    } else {
      // Fatal error - delete message to prevent infinite retries
      logger.error('Fatal error - deleting message to prevent infinite retries');
      await deleteMessage(message.ReceiptHandle);

      // Log to monitoring system
      await logFatalError(error, message);
    }
  }
}

/**
 * Send payment status to payment queue
 */
async function sendPaymentNotification(paymentResult, orderData) {
  const message = {
    paymentId: paymentResult.id,
    orderId: orderData.orderId,
    userId: orderData.userId,
    status: paymentResult.status,
    amount: paymentResult.amount,
    transactionId: paymentResult.transactionId,
    timestamp: new Date().toISOString()
  };

  const params = {
    QueueUrl: PAYMENT_QUEUE_URL,
    MessageBody: JSON.stringify(message),
    MessageGroupId: `order-${orderData.orderId}`, // FIFO grouping
    MessageDeduplicationId: `${paymentResult.id}-${Date.now()}`, // Deduplication
    MessageAttributes: {
      eventType: {
        DataType: 'String',
        StringValue: 'PAYMENT_PROCESSED'
      },
      status: {
        DataType: 'String',
        StringValue: paymentResult.status
      }
    }
  };

  await sqs.sendMessage(params).promise();
  logger.info(`Sent payment notification for order ${orderData.orderId}`);
}

/**
 * Send notification message
 */
async function sendNotificationMessage(paymentResult, orderData) {
  const message = {
    type: 'email',
    recipient: orderData.userEmail,
    subject: paymentResult.status === 'success'
      ? 'Payment Successful'
      : 'Payment Failed',
    template: paymentResult.status === 'success'
      ? 'payment_success'
      : 'payment_failed',
    data: {
      orderId: orderData.orderId,
      paymentId: paymentResult.id,
      amount: paymentResult.amount,
      status: paymentResult.status,
      transactionId: paymentResult.transactionId
    }
  };

  const params = {
    QueueUrl: NOTIFICATION_QUEUE_URL,
    MessageBody: JSON.stringify(message),
    MessageAttributes: {
      notificationType: {
        DataType: 'String',
        StringValue: 'email'
      },
      priority: {
        DataType: 'String',
        StringValue: 'high'
      }
    }
  };

  await sqs.sendMessage(params).promise();
  logger.info(`Sent notification message for order ${orderData.orderId}`);
}

/**
 * Delete message from queue
 */
async function deleteMessage(receiptHandle) {
  const params = {
    QueueUrl: ORDER_QUEUE_URL,
    ReceiptHandle: receiptHandle
  };

  await sqs.deleteMessage(params).promise();
}

/**
 * Check if error is retryable
 */
function isRetryableError(error) {
  // Network errors, timeouts, rate limits are retryable
  const retryableErrors = [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'NetworkingError',
    'TimeoutError',
    'ThrottlingException',
    'ServiceUnavailable'
  ];

  return retryableErrors.some(errType =>
    error.code === errType ||
    error.name === errType ||
    error.message.includes(errType)
  );
}

/**
 * Log fatal error to monitoring system
 */
async function logFatalError(error, message) {
  try {
    // Log to CloudWatch, Datadog, or your monitoring system
    logger.error('FATAL ERROR in SQS processing:', {
      error: error.message,
      stack: error.stack,
      messageId: message.MessageId,
      body: message.Body,
      timestamp: new Date().toISOString()
    });

    // Optionally send alert
    // await sendAlert('Fatal SQS Processing Error', error);
  } catch (logError) {
    console.error('Failed to log fatal error:', logError);
  }
}

/**
 * Start the worker
 */
function start() {
  if (!ORDER_QUEUE_URL) {
    logger.error('Cannot start worker: ORDER_QUEUE_URL not configured');
    process.exit(1);
  }

  logger.info('Starting Order Queue Worker...');
  logger.info(`Queue URL: ${ORDER_QUEUE_URL}`);

  // Start polling
  pollMessages();

  // Health check endpoint
  const healthCheck = setInterval(() => {
    logger.debug('Worker health check - OK');
  }, 60000); // Every minute

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    clearInterval(healthCheck);
    isPolling = false;

    // Wait for current messages to finish
    await new Promise(resolve => setTimeout(resolve, 5000));

    logger.info('Worker stopped');
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    clearInterval(healthCheck);
    isPolling = false;

    // Wait for current messages to finish
    await new Promise(resolve => setTimeout(resolve, 5000));

    logger.info('Worker stopped');
    process.exit(0);
  });
}

/**
 * Stop the worker
 */
function stop() {
  logger.info('Stopping worker...');
  isPolling = false;
  if (pollInterval) {
    clearInterval(pollInterval);
  }
}

// Export functions
module.exports = {
  start,
  stop,
  pollMessages
};

// Start worker if run directly
if (require.main === module) {
  start();
}
