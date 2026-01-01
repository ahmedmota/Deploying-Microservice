const AWS = require('aws-sdk');
const logger = require('../utils/logger');

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

// Send message to SQS
const sendMessage = async (queueUrl, messageBody) => {
  if (!queueUrl) {
    logger.warn('Queue URL not configured, skipping message send');
    return null;
  }

  const params = {
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(messageBody),
    MessageAttributes: {
      Timestamp: {
        DataType: 'String',
        StringValue: new Date().toISOString(),
      },
    },
  };

  try {
    const result = await sqs.sendMessage(params).promise();
    logger.info(`Message sent to SQS: ${result.MessageId}`);
    return result;
  } catch (error) {
    logger.error('Error sending message to SQS:', error);
    throw error;
  }
};

// Receive messages from SQS
const receiveMessages = async (queueUrl, maxMessages = 10) => {
  const params = {
    QueueUrl: queueUrl,
    MaxNumberOfMessages: maxMessages,
    WaitTimeSeconds: 20,
    VisibilityTimeout: 30,
  };

  try {
    const result = await sqs.receiveMessage(params).promise();
    return result.Messages || [];
  } catch (error) {
    logger.error('Error receiving messages from SQS:', error);
    throw error;
  }
};

// Delete message from SQS
const deleteMessage = async (queueUrl, receiptHandle) => {
  const params = {
    QueueUrl: queueUrl,
    ReceiptHandle: receiptHandle,
  };

  try {
    await sqs.deleteMessage(params).promise();
    logger.info('Message deleted from SQS');
  } catch (error) {
    logger.error('Error deleting message from SQS:', error);
    throw error;
  }
};

module.exports = {
  sqs,
  sendMessage,
  receiveMessages,
  deleteMessage,
};
