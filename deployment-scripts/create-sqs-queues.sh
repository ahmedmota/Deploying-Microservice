#!/bin/bash

# Create SQS Queues for E-Commerce Platform
# Usage: ./create-sqs-queues.sh

set -e

# Load infrastructure configuration
if [ -f infrastructure-config.txt ]; then
    source infrastructure-config.txt
fi

AWS_REGION="${AWS_REGION:-ap-southeast-1}"
PROJECT_NAME="${PROJECT_NAME:-ecommerce}"

echo "========================================="
echo "Creating SQS Queues"
echo "========================================="
echo "Region: $AWS_REGION"
echo "Project: $PROJECT_NAME"
echo ""

# Create Dead Letter Queue (DLQ)
echo "Creating Dead Letter Queue..."
DLQ_URL=$(aws sqs create-queue \
  --queue-name ${PROJECT_NAME}-dlq \
  --attributes MessageRetentionPeriod=1209600 \
  --region $AWS_REGION \
  --tags Key=Name,Value=${PROJECT_NAME}-dlq Key=Environment,Value=production \
  --query 'QueueUrl' \
  --output text)

echo "DLQ Created: $DLQ_URL"

# Get DLQ ARN
DLQ_ARN=$(aws sqs get-queue-attributes \
  --queue-url $DLQ_URL \
  --attribute-names QueueArn \
  --region $AWS_REGION \
  --query 'Attributes.QueueArn' \
  --output text)

echo "DLQ ARN: $DLQ_ARN"
echo ""

# Create Order Processing Queue
echo "Creating Order Processing Queue..."
ORDER_QUEUE_URL=$(aws sqs create-queue \
  --queue-name ${PROJECT_NAME}-order-queue \
  --attributes '{
    "VisibilityTimeout": "300",
    "MessageRetentionPeriod": "345600",
    "ReceiveMessageWaitTimeSeconds": "20",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"'"$DLQ_ARN"'\",\"maxReceiveCount\":\"3\"}"
  }' \
  --region $AWS_REGION \
  --tags Key=Name,Value=${PROJECT_NAME}-order-queue Key=Service,Value=order Key=Environment,Value=production \
  --query 'QueueUrl' \
  --output text)

echo "Order Queue Created: $ORDER_QUEUE_URL"
echo ""

# Create Payment Processing Queue (FIFO)
echo "Creating Payment Processing Queue (FIFO)..."
PAYMENT_QUEUE_URL=$(aws sqs create-queue \
  --queue-name ${PROJECT_NAME}-payment-queue.fifo \
  --attributes '{
    "FifoQueue": "true",
    "ContentBasedDeduplication": "true",
    "VisibilityTimeout": "300",
    "MessageRetentionPeriod": "345600",
    "ReceiveMessageWaitTimeSeconds": "20",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"'"$DLQ_ARN"'\",\"maxReceiveCount\":\"3\"}"
  }' \
  --region $AWS_REGION \
  --tags Key=Name,Value=${PROJECT_NAME}-payment-queue Key=Service,Value=payment Key=Environment,Value=production \
  --query 'QueueUrl' \
  --output text)

echo "Payment Queue Created: $PAYMENT_QUEUE_URL"
echo ""

# Create Notification Queue
echo "Creating Notification Queue..."
NOTIFICATION_QUEUE_URL=$(aws sqs create-queue \
  --queue-name ${PROJECT_NAME}-notification-queue \
  --attributes '{
    "VisibilityTimeout": "60",
    "MessageRetentionPeriod": "345600",
    "ReceiveMessageWaitTimeSeconds": "20",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"'"$DLQ_ARN"'\",\"maxReceiveCount\":\"3\"}"
  }' \
  --region $AWS_REGION \
  --tags Key=Name,Value=${PROJECT_NAME}-notification-queue Key=Service,Value=notification Key=Environment,Value=production \
  --query 'QueueUrl' \
  --output text)

echo "Notification Queue Created: $NOTIFICATION_QUEUE_URL"
echo ""

# Enable encryption at rest (optional but recommended)
echo "Enabling encryption at rest for queues..."

aws sqs set-queue-attributes \
  --queue-url $ORDER_QUEUE_URL \
  --attributes KmsMasterKeyId=alias/aws/sqs \
  --region $AWS_REGION

aws sqs set-queue-attributes \
  --queue-url $PAYMENT_QUEUE_URL \
  --attributes KmsMasterKeyId=alias/aws/sqs \
  --region $AWS_REGION

aws sqs set-queue-attributes \
  --queue-url $NOTIFICATION_QUEUE_URL \
  --attributes KmsMasterKeyId=alias/aws/sqs \
  --region $AWS_REGION

echo "Encryption enabled for all queues"
echo ""

# Save queue URLs to file
cat > sqs-config.txt << EOF
# SQS Queue Configuration
AWS_REGION=$AWS_REGION
DLQ_URL=$DLQ_URL
DLQ_ARN=$DLQ_ARN
ORDER_QUEUE_URL=$ORDER_QUEUE_URL
PAYMENT_QUEUE_URL=$PAYMENT_QUEUE_URL
NOTIFICATION_QUEUE_URL=$NOTIFICATION_QUEUE_URL
EOF

echo "========================================="
echo "SQS Queues Created Successfully!"
echo "========================================="
echo ""
echo "Queue URLs:"
echo "  Dead Letter Queue:     $DLQ_URL"
echo "  Order Queue:           $ORDER_QUEUE_URL"
echo "  Payment Queue (FIFO):  $PAYMENT_QUEUE_URL"
echo "  Notification Queue:    $NOTIFICATION_QUEUE_URL"
echo ""
echo "Configuration saved to sqs-config.txt"
echo ""
echo "Next steps:"
echo "1. Update your service environment variables with queue URLs"
echo "2. Configure IAM permissions for SQS access"
echo "3. Deploy queue workers to process messages"
echo "4. Set up CloudWatch alarms for queue monitoring"
echo ""
echo "To view queue attributes:"
echo "  aws sqs get-queue-attributes --queue-url <queue-url> --attribute-names All"
echo ""
echo "To send test message:"
echo "  aws sqs send-message --queue-url $ORDER_QUEUE_URL --message-body '{\"test\":\"message\"}'"
echo ""
