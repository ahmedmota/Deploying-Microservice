# AWS SQS Setup Guide for E-Commerce Microservices

## Overview

Amazon Simple Queue Service (SQS) enables asynchronous communication between microservices. This guide covers implementing SQS for your e-commerce platform.

## Architecture with SQS

```
Order Service ──────┐
                    │
                    ├──▶ [Order Queue] ──▶ Payment Service (Consumer)
                    │
                    └──▶ [Payment Queue] ──▶ Notification Service (Consumer)

Payment Service ────┐
                    │
                    └──▶ [Notification Queue] ──▶ Notification Service (Consumer)
```

## Why Use SQS?

1. **Decoupling** - Services don't need to communicate directly
2. **Reliability** - Messages are persisted until processed
3. **Scalability** - Handle traffic spikes by queuing requests
4. **Fault Tolerance** - Failed messages go to Dead Letter Queue (DLQ)
5. **Async Processing** - Non-blocking operations

## SQS Queues for E-Commerce Platform

### 1. Order Processing Queue
- **Purpose**: Order creation events
- **Producer**: Order Service
- **Consumer**: Payment Service
- **Type**: Standard (at-least-once delivery)
- **Message**: Order details, user info, items

### 2. Payment Processing Queue
- **Purpose**: Payment transaction events
- **Producer**: Payment Service
- **Consumer**: Order Service, Notification Service
- **Type**: FIFO (exactly-once processing)
- **Message**: Payment status, transaction ID

### 3. Notification Queue
- **Purpose**: Email/SMS notifications
- **Producer**: All services
- **Consumer**: Notification Service
- **Type**: Standard
- **Message**: Notification type, recipient, content

### 4. Dead Letter Queue (DLQ)
- **Purpose**: Failed messages from all queues
- **Consumer**: Manual inspection/retry
- **Type**: Standard

## Setup Instructions

### Step 1: Create SQS Queues

Use the provided script:

```bash
cd deployment-scripts
./create-sqs-queues.sh
```

Or manually via AWS CLI:

```bash
# Create Dead Letter Queue first
aws sqs create-queue \
  --queue-name ecommerce-dlq \
  --attributes MessageRetentionPeriod=1209600 \
  --region ap-southeast-1

# Get DLQ ARN
DLQ_ARN=$(aws sqs get-queue-attributes \
  --queue-url <dlq-url> \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

# Create Order Processing Queue
aws sqs create-queue \
  --queue-name ecommerce-order-queue \
  --attributes '{
    "VisibilityTimeout": "300",
    "MessageRetentionPeriod": "345600",
    "ReceiveMessageWaitTimeSeconds": "20",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"'$DLQ_ARN'\",\"maxReceiveCount\":\"3\"}"
  }' \
  --region ap-southeast-1

# Create Payment Processing Queue (FIFO)
aws sqs create-queue \
  --queue-name ecommerce-payment-queue.fifo \
  --attributes '{
    "FifoQueue": "true",
    "ContentBasedDeduplication": "true",
    "VisibilityTimeout": "300",
    "MessageRetentionPeriod": "345600",
    "ReceiveMessageWaitTimeSeconds": "20",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"'$DLQ_ARN'\",\"maxReceiveCount\":\"3\"}"
  }' \
  --region ap-southeast-1

# Create Notification Queue
aws sqs create-queue \
  --queue-name ecommerce-notification-queue \
  --attributes '{
    "VisibilityTimeout": "60",
    "MessageRetentionPeriod": "345600",
    "ReceiveMessageWaitTimeSeconds": "20",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"'$DLQ_ARN'\",\"maxReceiveCount\":\"3\"}"
  }' \
  --region ap-southeast-1
```

### Step 2: Configure IAM Permissions

Create IAM policy for SQS access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl"
      ],
      "Resource": [
        "arn:aws:sqs:ap-southeast-1:*:ecommerce-*"
      ]
    }
  ]
}
```

Attach to EC2 instance role or use IAM user credentials.

### Step 3: Update Service Code

#### Order Service - Send to Queue

```javascript
// In order-service/src/services/orderService.js
const AWS = require('aws-sdk');

const sqs = new AWS.SQS({
  region: process.env.AWS_REGION || 'ap-southeast-1'
});

async function createOrder(orderData) {
  // Create order in database
  const order = await Order.create(orderData);

  // Send message to SQS
  const params = {
    QueueUrl: process.env.ORDER_QUEUE_URL,
    MessageBody: JSON.stringify({
      orderId: order.id,
      userId: order.userId,
      items: order.items,
      totalAmount: order.totalAmount,
      timestamp: new Date().toISOString()
    }),
    MessageAttributes: {
      eventType: {
        DataType: 'String',
        StringValue: 'ORDER_CREATED'
      }
    }
  };

  await sqs.sendMessage(params).promise();

  return order;
}
```

#### Payment Service - Consume from Queue

```javascript
// In payment-service/src/workers/orderQueueWorker.js
const AWS = require('aws-sdk');
const paymentService = require('../services/paymentService');

const sqs = new AWS.SQS({
  region: process.env.AWS_REGION || 'ap-southeast-1'
});

async function pollMessages() {
  const params = {
    QueueUrl: process.env.ORDER_QUEUE_URL,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 20,
    VisibilityTimeout: 300
  };

  try {
    const data = await sqs.receiveMessage(params).promise();

    if (data.Messages) {
      for (const message of data.Messages) {
        await processMessage(message);
      }
    }
  } catch (error) {
    console.error('Error polling messages:', error);
  }

  // Continue polling
  setImmediate(pollMessages);
}

async function processMessage(message) {
  try {
    const orderData = JSON.parse(message.Body);

    // Process payment
    await paymentService.processOrderPayment(orderData);

    // Delete message from queue
    await sqs.deleteMessage({
      QueueUrl: process.env.ORDER_QUEUE_URL,
      ReceiptHandle: message.ReceiptHandle
    }).promise();

    console.log(`Processed order: ${orderData.orderId}`);
  } catch (error) {
    console.error('Error processing message:', error);
    // Message will return to queue after visibility timeout
  }
}

// Start polling
pollMessages();
```

### Step 4: Deploy Queue Workers

Workers run alongside your services using PM2:

```bash
# On Payment Service EC2 instance
cd /opt/ecommerce/payment-service

# Start the queue worker
pm2 start src/workers/orderQueueWorker.js --name payment-queue-worker

# Save PM2 config
pm2 save
```

## Message Formats

### Order Created Message

```json
{
  "orderId": "ord_123456",
  "userId": "user_789",
  "items": [
    {
      "productId": "prod_001",
      "quantity": 2,
      "price": 29.99
    }
  ],
  "totalAmount": 59.98,
  "timestamp": "2024-01-02T10:30:00Z"
}
```

### Payment Processed Message (FIFO)

```json
{
  "paymentId": "pay_123456",
  "orderId": "ord_123456",
  "status": "success",
  "amount": 59.98,
  "transactionId": "txn_abc123",
  "timestamp": "2024-01-02T10:31:00Z"
}
```

### Notification Message

```json
{
  "type": "email",
  "recipient": "user@example.com",
  "subject": "Order Confirmation",
  "template": "order_confirmation",
  "data": {
    "orderId": "ord_123456",
    "items": [...],
    "totalAmount": 59.98
  }
}
```

## Best Practices

### 1. Visibility Timeout

Set based on processing time:
- Short tasks (notifications): 60 seconds
- Medium tasks (payments): 300 seconds (5 minutes)
- Long tasks: 900 seconds (15 minutes)

### 2. Dead Letter Queue

Configure maxReceiveCount:
- Critical operations: 5 retries
- Normal operations: 3 retries
- Background tasks: 10 retries

### 3. Message Deduplication (FIFO)

Use unique message group IDs:
```javascript
MessageGroupId: `order-${orderId}`,
MessageDeduplicationId: `${orderId}-${timestamp}`
```

### 4. Batch Operations

Send/receive messages in batches:
```javascript
const params = {
  QueueUrl: queueUrl,
  Entries: messages.map((msg, index) => ({
    Id: `msg-${index}`,
    MessageBody: JSON.stringify(msg)
  }))
};

await sqs.sendMessageBatch(params).promise();
```

### 5. Error Handling

```javascript
async function processMessage(message) {
  try {
    // Process message
    await handleMessage(message);

    // Delete on success
    await deleteMessage(message);
  } catch (error) {
    if (isRetryable(error)) {
      // Let message return to queue
      console.log('Retryable error, message will retry');
    } else {
      // Delete to prevent infinite retries
      await deleteMessage(message);
      // Log to monitoring system
      await logFatalError(error, message);
    }
  }
}
```

## Monitoring SQS

### CloudWatch Metrics

Monitor these metrics:
- `ApproximateNumberOfMessagesVisible` - Messages in queue
- `ApproximateNumberOfMessagesNotVisible` - Messages being processed
- `NumberOfMessagesSent` - Messages sent to queue
- `NumberOfMessagesReceived` - Messages received from queue
- `ApproximateAgeOfOldestMessage` - Age of oldest message

### Set Up Alarms

```bash
# Alert when queue has too many messages
aws cloudwatch put-metric-alarm \
  --alarm-name high-queue-depth \
  --alarm-description "Queue depth is too high" \
  --metric-name ApproximateNumberOfMessagesVisible \
  --namespace AWS/SQS \
  --statistic Average \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=QueueName,Value=ecommerce-order-queue \
  --evaluation-periods 2
```

### View Queue Metrics

```bash
# Get queue attributes
aws sqs get-queue-attributes \
  --queue-url <queue-url> \
  --attribute-names All

# Purge queue (development only!)
aws sqs purge-queue --queue-url <queue-url>
```

## Scaling Considerations

### Horizontal Scaling

Add more consumer instances:
```bash
# Launch additional EC2 instances for Payment Service
# Each instance will poll the same queue
# SQS automatically distributes messages
```

### Auto-Scaling Based on Queue Depth

```bash
# Create CloudWatch alarm
aws cloudwatch put-metric-alarm \
  --alarm-name scale-up-on-queue-depth \
  --metric-name ApproximateNumberOfMessagesVisible \
  --namespace AWS/SQS \
  --statistic Average \
  --period 300 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold

# Link to Auto Scaling Group
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name payment-service-asg \
  --policy-name scale-up \
  --scaling-adjustment 1 \
  --adjustment-type ChangeInCapacity
```

## Testing SQS

### Send Test Message

```bash
# Send test message
aws sqs send-message \
  --queue-url <queue-url> \
  --message-body '{"test": "message"}' \
  --message-attributes eventType={DataType=String,StringValue=TEST}

# Receive message
aws sqs receive-message \
  --queue-url <queue-url> \
  --max-number-of-messages 1

# Delete message
aws sqs delete-message \
  --queue-url <queue-url> \
  --receipt-handle <receipt-handle>
```

### Test from Code

```javascript
// test-sqs.js
const AWS = require('aws-sdk');
const sqs = new AWS.SQS({ region: 'ap-southeast-1' });

async function testSQS() {
  const queueUrl = process.env.ORDER_QUEUE_URL;

  // Send message
  await sqs.sendMessage({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify({ test: 'message' })
  }).promise();

  console.log('Message sent');

  // Receive message
  const data = await sqs.receiveMessage({
    QueueUrl: queueUrl,
    MaxNumberOfMessages: 1
  }).promise();

  console.log('Message received:', data.Messages);
}

testSQS();
```

## Cost Optimization

SQS pricing (Free Tier):
- First 1 million requests per month: FREE
- After that: $0.40 per million requests

Tips:
1. Use long polling (WaitTimeSeconds: 20) - Reduces empty receives
2. Batch messages when possible
3. Delete processed messages promptly
4. Use appropriate message retention period

## Troubleshooting

### Messages Not Being Processed

```bash
# Check queue depth
aws sqs get-queue-attributes \
  --queue-url <queue-url> \
  --attribute-names ApproximateNumberOfMessagesVisible

# Check if worker is running
pm2 list

# Check worker logs
pm2 logs payment-queue-worker
```

### Messages Going to DLQ

```bash
# Check DLQ
aws sqs receive-message \
  --queue-url <dlq-url> \
  --max-number-of-messages 10

# Reprocess messages from DLQ
# Manual review and resubmit to main queue if needed
```

### High Latency

- Increase number of consumer instances
- Increase MaxNumberOfMessages in receive call
- Check visibility timeout settings
- Monitor consumer processing time

## Security Best Practices

1. **Encryption**: Enable encryption at rest
```bash
aws sqs set-queue-attributes \
  --queue-url <queue-url> \
  --attributes KmsMasterKeyId=alias/aws/sqs
```

2. **Access Policy**: Restrict queue access
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::ACCOUNT-ID:role/EC2-Role"
    },
    "Action": ["sqs:SendMessage", "sqs:ReceiveMessage"],
    "Resource": "arn:aws:sqs:region:account-id:queue-name"
  }]
}
```

3. **Use IAM Roles**: Attach to EC2 instances instead of access keys

## Next Steps

1. Create queues using provided scripts
2. Update service code to send/receive messages
3. Deploy queue workers with PM2
4. Set up CloudWatch alarms
5. Test end-to-end message flow
6. Monitor queue metrics

For implementation scripts, see:
- `deployment-scripts/create-sqs-queues.sh`
- `deployment-scripts/deploy-with-sqs.sh`
