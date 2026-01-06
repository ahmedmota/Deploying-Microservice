# SQS Implementation Summary

Complete guide for implementing AWS SQS in your e-commerce microservices platform.

## What Has Been Created

### Documentation
1. **SQS_SETUP_GUIDE.md** - Comprehensive guide covering SQS setup, configuration, and best practices

### Scripts (in deployment-scripts/)
1. **create-sqs-queues.sh** - Creates all SQS queues with proper configuration
2. **setup-sqs-iam.sh** - Sets up IAM roles and policies for SQS access
3. **deploy-with-sqs.sh** - Updates services and deploys SQS workers
4. **test-sqs.sh** - Tests SQS integration with various scenarios

### Code Files
1. **payment-service/src/workers/orderQueueWorker.js** - Worker that processes order messages
2. **order-service/src/services/sqsService.js** - Service to send messages to SQS

## Quick Start

### 1. Create SQS Queues

```bash
cd deployment-scripts
chmod +x create-sqs-queues.sh setup-sqs-iam.sh deploy-with-sqs.sh test-sqs.sh

# Create queues
./create-sqs-queues.sh
```

This creates:
- **ecommerce-order-queue** - For order processing
- **ecommerce-payment-queue.fifo** - For payment events (FIFO)
- **ecommerce-notification-queue** - For notifications
- **ecommerce-dlq** - Dead Letter Queue for failed messages

### 2. Setup IAM Permissions

```bash
# Create IAM role and policy
./setup-sqs-iam.sh
```

This creates:
- IAM policy with SQS permissions
- IAM role for EC2 instances
- Instance profile

### 3. Attach IAM Role to EC2 Instances

**For existing instances:**
```bash
# Get the instance profile name from iam-config.txt
source iam-config.txt

# Stop instance
aws ec2 stop-instances --instance-ids <instance-id>

# Attach IAM role
aws ec2 associate-iam-instance-profile \
  --instance-id <instance-id> \
  --iam-instance-profile Name=$INSTANCE_PROFILE_NAME

# Start instance
aws ec2 start-instances --instance-ids <instance-id>
```

**For new instances:**
```bash
# Launch with instance profile
aws ec2 run-instances \
  --image-id ami-xxxxx \
  --instance-type t3.small \
  --iam-instance-profile Name=ecommerce-ec2-instance-profile \
  ...
```

### 4. Deploy Services with SQS

```bash
# Deploy all services with SQS integration
./deploy-with-sqs.sh

# Choose option 4 to update all services
# Or choose individual services (1-3)
```

This will:
- Update .env files with SQS queue URLs
- Restart services
- Deploy SQS workers with PM2

### 5. Test SQS Integration

```bash
# Run tests
./test-sqs.sh

# Choose option 6 for full integration test
```

## Architecture

### Message Flow

```
1. Order Service creates order
   ↓
2. Order Service sends message to Order Queue
   ↓
3. Payment Service worker polls Order Queue
   ↓
4. Payment Service processes payment
   ↓
5. Payment Service sends to Payment Queue (FIFO)
   ↓
6. Payment Service sends to Notification Queue
   ↓
7. Notification Service worker processes notification
   ↓
8. Email/SMS sent to customer
```

### Queue Configuration

| Queue | Type | Visibility Timeout | Retention | Max Receives |
|-------|------|-------------------|-----------|--------------|
| Order Queue | Standard | 300s (5min) | 4 days | 3 |
| Payment Queue | FIFO | 300s (5min) | 4 days | 3 |
| Notification Queue | Standard | 60s (1min) | 4 days | 3 |
| Dead Letter Queue | Standard | 300s (5min) | 14 days | - |

## Integration in Your Code

### Order Service - Sending Messages

Update your order controller to send SQS messages:

```javascript
// In order-service/src/controllers/orderController.js
const sqsService = require('../services/sqsService');

async function createOrder(req, res) {
  try {
    // Create order in database
    const order = await Order.create(req.body);

    // Send message to SQS
    await sqsService.sendOrderCreatedMessage(order);

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### Payment Service - Processing Messages

The worker automatically processes messages:

```javascript
// Worker runs continuously
// Located at: payment-service/src/workers/orderQueueWorker.js

// Start with PM2:
// pm2 start src/workers/orderQueueWorker.js --name payment-queue-worker
```

### Environment Variables

Add to your service .env files:

```bash
# Order Service
AWS_REGION=ap-southeast-1
ORDER_QUEUE_URL=https://sqs.ap-southeast-1.amazonaws.com/.../ecommerce-order-queue

# Payment Service
AWS_REGION=ap-southeast-1
ORDER_QUEUE_URL=https://sqs.ap-southeast-1.amazonaws.com/.../ecommerce-order-queue
PAYMENT_QUEUE_URL=https://sqs.ap-southeast-1.amazonaws.com/.../ecommerce-payment-queue.fifo
NOTIFICATION_QUEUE_URL=https://sqs.ap-southeast-1.amazonaws.com/.../ecommerce-notification-queue

# Notification Service
AWS_REGION=ap-southeast-1
NOTIFICATION_QUEUE_URL=https://sqs.ap-southeast-1.amazonaws.com/.../ecommerce-notification-queue
```

## PM2 Configuration

Workers run alongside your services:

```bash
# On Payment Service EC2
pm2 list
# Should show:
# - payment-service (main app)
# - payment-queue-worker (SQS worker)

# View worker logs
pm2 logs payment-queue-worker

# Restart worker
pm2 restart payment-queue-worker

# Monitor
pm2 monit
```

## Monitoring

### CloudWatch Metrics

Monitor these metrics in CloudWatch:

1. **ApproximateNumberOfMessagesVisible** - Messages waiting
2. **ApproximateNumberOfMessagesNotVisible** - Being processed
3. **NumberOfMessagesSent** - Messages sent
4. **NumberOfMessagesReceived** - Messages received

### Set Up Alarms

```bash
# Alert when queue depth is too high
aws cloudwatch put-metric-alarm \
  --alarm-name high-order-queue-depth \
  --alarm-description "Too many unprocessed orders" \
  --metric-name ApproximateNumberOfMessagesVisible \
  --namespace AWS/SQS \
  --statistic Average \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=QueueName,Value=ecommerce-order-queue \
  --evaluation-periods 2
```

### Check Queue Status

```bash
# Load queue URLs
source deployment-scripts/sqs-config.txt

# Check order queue
aws sqs get-queue-attributes \
  --queue-url $ORDER_QUEUE_URL \
  --attribute-names All

# Check dead letter queue
aws sqs get-queue-attributes \
  --queue-url $DLQ_URL \
  --attribute-names ApproximateNumberOfMessages
```

## Troubleshooting

### Messages Not Being Processed

```bash
# 1. Check if worker is running
ssh -i danish-tokyo.pem ubuntu@<payment-ec2-ip>
pm2 list | grep queue-worker

# 2. Check worker logs
pm2 logs payment-queue-worker --lines 50

# 3. Check queue has messages
aws sqs get-queue-attributes \
  --queue-url $ORDER_QUEUE_URL \
  --attribute-names ApproximateNumberOfMessagesVisible

# 4. Check IAM permissions
aws sqs receive-message --queue-url $ORDER_QUEUE_URL
```

### Messages Going to DLQ

```bash
# Check DLQ for failed messages
aws sqs receive-message \
  --queue-url $DLQ_URL \
  --max-number-of-messages 10

# Common reasons:
# - Processing throws exception repeatedly
# - Message format is invalid
# - Dependent service is down
# - Timeout too short for processing

# Fix and reprocess:
# 1. Fix the issue in worker code
# 2. Deploy updated worker
# 3. Manually retrieve from DLQ and resubmit to main queue
```

### Worker Crashes

```bash
# Check PM2 logs
pm2 logs payment-queue-worker --err

# Restart worker
pm2 restart payment-queue-worker

# Check for:
# - Missing environment variables
# - Database connection issues
# - Memory leaks (check --max-memory-restart)
# - Unhandled promise rejections
```

## Best Practices Implemented

### 1. Long Polling
- WaitTimeSeconds: 20 (reduces empty receives)

### 2. Visibility Timeout
- Set based on processing time
- Payment processing: 5 minutes
- Notifications: 1 minute

### 3. Dead Letter Queue
- maxReceiveCount: 3 (retry 3 times)
- Retention: 14 days
- Manual review process

### 4. FIFO for Payment Queue
- Guarantees exactly-once processing
- Maintains order of payment events
- Content-based deduplication

### 5. Error Handling
- Retryable errors: Let message return to queue
- Fatal errors: Delete message, log for review
- Graceful shutdown on SIGTERM

### 6. Monitoring
- CloudWatch metrics enabled
- Alarms for queue depth
- Worker health checks

### 7. Security
- IAM roles instead of access keys
- Encryption at rest enabled
- VPC endpoints (optional)

## Scaling

### Horizontal Scaling

Add more worker instances:

```bash
# Launch additional Payment Service EC2
# Worker automatically starts polling the same queue
# SQS distributes messages across all consumers
```

### Auto-Scaling

Scale based on queue depth:

```bash
# Create scaling policy
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name payment-service-asg \
  --policy-name scale-up-on-queue-depth \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "CustomizedMetricSpecification": {
      "MetricName": "ApproximateNumberOfMessagesVisible",
      "Namespace": "AWS/SQS",
      "Dimensions": [{
        "Name": "QueueName",
        "Value": "ecommerce-order-queue"
      }],
      "Statistic": "Average"
    },
    "TargetValue": 50.0
  }'
```

## Cost Optimization

SQS is very cost-effective:

```
Free Tier: 1 million requests/month FREE
After that: $0.40 per million requests

Example monthly cost:
- 10 million messages/month
- Cost: 9M × $0.40 = $3.60/month

Tips to reduce costs:
1. Use long polling (reduces empty receives)
2. Batch messages when possible
3. Delete processed messages promptly
```

## Testing Checklist

- [ ] Queues created successfully
- [ ] IAM role attached to EC2 instances
- [ ] Services updated with queue URLs
- [ ] Workers deployed and running
- [ ] Test message sent successfully
- [ ] Worker processes message
- [ ] Payment processed in database
- [ ] Notification sent
- [ ] Failed messages go to DLQ
- [ ] CloudWatch metrics visible
- [ ] Alarms configured

## Next Steps

1. **Add More Workers**
   - Create notification queue worker
   - Add inventory update worker

2. **Implement Retry Logic**
   - Exponential backoff
   - Circuit breaker pattern

3. **Add Monitoring**
   - Datadog or New Relic integration
   - Custom metrics dashboard

4. **Performance Testing**
   - Load test with 1000+ messages
   - Measure processing time
   - Optimize worker concurrency

5. **Disaster Recovery**
   - Cross-region queue replication
   - Backup and restore procedures

## Resources

- AWS SQS Documentation: https://docs.aws.amazon.com/sqs/
- AWS SDK for JavaScript: https://docs.aws.amazon.com/sdk-for-javascript/
- SQS Best Practices: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-best-practices.html

## Support

For issues:
1. Check worker logs: `pm2 logs payment-queue-worker`
2. Check queue status: `aws sqs get-queue-attributes --queue-url <url> --attribute-names All`
3. Test manually: `./test-sqs.sh`
4. Review main guide: `SQS_SETUP_GUIDE.md`
