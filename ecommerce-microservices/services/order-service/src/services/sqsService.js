const AWS = require('aws-sdk');
const logger = require('../utils/logger');

const sqs = new AWS.SQS({
  region: process.env.AWS_REGION || 'ap-southeast-1'
});

const ORDER_QUEUE_URL = process.env.ORDER_QUEUE_URL;

/**
 * Send order created message to SQS
 */
async function sendOrderCreatedMessage(order) {
  if (!ORDER_QUEUE_URL) {
    logger.warn('ORDER_QUEUE_URL not configured, skipping SQS message');
    return null;
  }

  try {
    const message = {
      orderId: order.id,
      userId: order.userId,
      userEmail: order.userEmail || order.user?.email,
      items: order.items || order.OrderItems,
      totalAmount: order.totalAmount,
      currency: order.currency || 'USD',
      paymentMethod: order.paymentMethod || 'card',
      shippingAddress: order.shippingAddress,
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'order-service',
        version: '1.0'
      }
    };

    const params = {
      QueueUrl: ORDER_QUEUE_URL,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: 'ORDER_CREATED'
        },
        orderId: {
          DataType: 'String',
          StringValue: order.id.toString()
        },
        userId: {
          DataType: 'String',
          StringValue: order.userId.toString()
        },
        priority: {
          DataType: 'String',
          StringValue: 'high'
        },
        timestamp: {
          DataType: 'Number',
          StringValue: Date.now().toString()
        }
      },
      // Add delay if needed (0-900 seconds)
      DelaySeconds: 0
    };

    const result = await sqs.sendMessage(params).promise();

    logger.info(`Order created message sent to SQS: ${result.MessageId}`, {
      orderId: order.id,
      messageId: result.MessageId
    });

    return result;
  } catch (error) {
    logger.error('Error sending order created message to SQS:', error);
    throw error;
  }
}

/**
 * Send order updated message to SQS
 */
async function sendOrderUpdatedMessage(order, updateType) {
  if (!ORDER_QUEUE_URL) {
    logger.warn('ORDER_QUEUE_URL not configured, skipping SQS message');
    return null;
  }

  try {
    const message = {
      orderId: order.id,
      userId: order.userId,
      status: order.status,
      updateType: updateType,
      timestamp: new Date().toISOString()
    };

    const params = {
      QueueUrl: ORDER_QUEUE_URL,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: 'ORDER_UPDATED'
        },
        updateType: {
          DataType: 'String',
          StringValue: updateType
        },
        orderId: {
          DataType: 'String',
          StringValue: order.id.toString()
        }
      }
    };

    const result = await sqs.sendMessage(params).promise();

    logger.info(`Order updated message sent to SQS: ${result.MessageId}`, {
      orderId: order.id,
      updateType,
      messageId: result.MessageId
    });

    return result;
  } catch (error) {
    logger.error('Error sending order updated message to SQS:', error);
    throw error;
  }
}

/**
 * Send batch messages to SQS
 */
async function sendBatchMessages(orders) {
  if (!ORDER_QUEUE_URL) {
    logger.warn('ORDER_QUEUE_URL not configured, skipping SQS messages');
    return null;
  }

  try {
    const entries = orders.map((order, index) => ({
      Id: `msg-${index}`,
      MessageBody: JSON.stringify({
        orderId: order.id,
        userId: order.userId,
        totalAmount: order.totalAmount,
        timestamp: new Date().toISOString()
      }),
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: 'ORDER_CREATED'
        },
        orderId: {
          DataType: 'String',
          StringValue: order.id.toString()
        }
      }
    }));

    // SQS batch limit is 10 messages
    const batches = [];
    for (let i = 0; i < entries.length; i += 10) {
      batches.push(entries.slice(i, i + 10));
    }

    const results = [];
    for (const batch of batches) {
      const params = {
        QueueUrl: ORDER_QUEUE_URL,
        Entries: batch
      };

      const result = await sqs.sendMessageBatch(params).promise();
      results.push(result);

      logger.info(`Sent batch of ${batch.length} messages to SQS`);

      // Log any failures
      if (result.Failed && result.Failed.length > 0) {
        logger.error('Some messages failed to send:', result.Failed);
      }
    }

    return results;
  } catch (error) {
    logger.error('Error sending batch messages to SQS:', error);
    throw error;
  }
}

/**
 * Get queue attributes
 */
async function getQueueAttributes() {
  if (!ORDER_QUEUE_URL) {
    return null;
  }

  try {
    const params = {
      QueueUrl: ORDER_QUEUE_URL,
      AttributeNames: ['All']
    };

    const result = await sqs.getQueueAttributes(params).promise();

    return {
      approximateNumberOfMessages: result.Attributes.ApproximateNumberOfMessages,
      approximateNumberOfMessagesNotVisible: result.Attributes.ApproximateNumberOfMessagesNotVisible,
      approximateNumberOfMessagesDelayed: result.Attributes.ApproximateNumberOfMessagesDelayed,
      messageRetentionPeriod: result.Attributes.MessageRetentionPeriod,
      visibilityTimeout: result.Attributes.VisibilityTimeout
    };
  } catch (error) {
    logger.error('Error getting queue attributes:', error);
    throw error;
  }
}

/**
 * Purge queue (use with caution!)
 */
async function purgeQueue() {
  if (!ORDER_QUEUE_URL) {
    return null;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot purge queue in production environment');
  }

  try {
    const params = {
      QueueUrl: ORDER_QUEUE_URL
    };

    await sqs.purgeQueue(params).promise();
    logger.warn('Queue purged successfully');
  } catch (error) {
    logger.error('Error purging queue:', error);
    throw error;
  }
}

module.exports = {
  sendOrderCreatedMessage,
  sendOrderUpdatedMessage,
  sendBatchMessages,
  getQueueAttributes,
  purgeQueue
};
