#!/bin/bash

# Test SQS Integration
# This script sends test messages to SQS queues and monitors processing

set -e

# Load SQS configuration
if [ ! -f sqs-config.txt ]; then
    echo "Error: sqs-config.txt not found. Run create-sqs-queues.sh first."
    exit 1
fi

source sqs-config.txt

echo "========================================="
echo "Testing SQS Integration"
echo "========================================="
echo ""

# Function to send test message
send_test_message() {
    local QUEUE_URL=$1
    local MESSAGE=$2
    local EVENT_TYPE=$3

    echo "Sending test message to queue..."
    echo "Queue: $QUEUE_URL"
    echo "Message: $MESSAGE"
    echo ""

    MESSAGE_ID=$(aws sqs send-message \
        --queue-url "$QUEUE_URL" \
        --message-body "$MESSAGE" \
        --message-attributes "eventType={DataType=String,StringValue=$EVENT_TYPE}" \
        --region $AWS_REGION \
        --query 'MessageId' \
        --output text)

    echo "✓ Message sent successfully!"
    echo "Message ID: $MESSAGE_ID"
    echo ""
}

# Function to check queue attributes
check_queue() {
    local QUEUE_URL=$1
    local QUEUE_NAME=$2

    echo "Checking $QUEUE_NAME..."

    ATTRIBUTES=$(aws sqs get-queue-attributes \
        --queue-url "$QUEUE_URL" \
        --attribute-names All \
        --region $AWS_REGION \
        --output json)

    MESSAGES_AVAILABLE=$(echo $ATTRIBUTES | jq -r '.Attributes.ApproximateNumberOfMessages')
    MESSAGES_IN_FLIGHT=$(echo $ATTRIBUTES | jq -r '.Attributes.ApproximateNumberOfMessagesNotVisible')
    MESSAGES_DELAYED=$(echo $ATTRIBUTES | jq -r '.Attributes.ApproximateNumberOfMessagesDelayed')

    echo "  Messages Available: $MESSAGES_AVAILABLE"
    echo "  Messages In Flight: $MESSAGES_IN_FLIGHT"
    echo "  Messages Delayed: $MESSAGES_DELAYED"
    echo ""
}

# Function to receive messages
receive_messages() {
    local QUEUE_URL=$1

    echo "Receiving messages from queue..."

    MESSAGES=$(aws sqs receive-message \
        --queue-url "$QUEUE_URL" \
        --max-number-of-messages 5 \
        --wait-time-seconds 5 \
        --region $AWS_REGION \
        --output json)

    MESSAGE_COUNT=$(echo $MESSAGES | jq -r '.Messages | length')

    if [ "$MESSAGE_COUNT" -gt 0 ]; then
        echo "✓ Received $MESSAGE_COUNT message(s)"
        echo "$MESSAGES" | jq '.Messages[] | {MessageId, Body}'
    else
        echo "No messages received"
    fi
    echo ""
}

# Main menu
echo "Select test option:"
echo "1. Send test order message"
echo "2. Send test payment message"
echo "3. Send test notification message"
echo "4. Check all queue statuses"
echo "5. Receive messages from order queue"
echo "6. Run full integration test"
echo ""
read -p "Enter option (1-6): " OPTION

case $OPTION in
    1)
        # Send test order message
        TEST_ORDER=$(cat <<EOF
{
  "orderId": "test-$(date +%s)",
  "userId": "user-123",
  "userEmail": "test@example.com",
  "items": [
    {
      "productId": "prod-001",
      "quantity": 2,
      "price": 29.99
    }
  ],
  "totalAmount": 59.98,
  "currency": "USD",
  "paymentMethod": "card",
  "timestamp": "$(date -Iseconds)"
}
EOF
)
        send_test_message "$ORDER_QUEUE_URL" "$TEST_ORDER" "ORDER_CREATED"
        ;;

    2)
        # Send test payment message (FIFO)
        TEST_PAYMENT=$(cat <<EOF
{
  "paymentId": "pay-$(date +%s)",
  "orderId": "ord-123",
  "status": "success",
  "amount": 59.98,
  "transactionId": "txn-abc123",
  "timestamp": "$(date -Iseconds)"
}
EOF
)

        # Note: FIFO queues require MessageGroupId and MessageDeduplicationId
        echo "Sending test payment message to FIFO queue..."
        MESSAGE_ID=$(aws sqs send-message \
            --queue-url "$PAYMENT_QUEUE_URL" \
            --message-body "$TEST_PAYMENT" \
            --message-group-id "test-group" \
            --message-deduplication-id "test-$(date +%s)" \
            --message-attributes "eventType={DataType=String,StringValue=PAYMENT_PROCESSED}" \
            --region $AWS_REGION \
            --query 'MessageId' \
            --output text)

        echo "✓ Message sent successfully!"
        echo "Message ID: $MESSAGE_ID"
        echo ""
        ;;

    3)
        # Send test notification message
        TEST_NOTIFICATION=$(cat <<EOF
{
  "type": "email",
  "recipient": "test@example.com",
  "subject": "Test Notification",
  "template": "test_template",
  "data": {
    "message": "This is a test notification"
  },
  "timestamp": "$(date -Iseconds)"
}
EOF
)
        send_test_message "$NOTIFICATION_QUEUE_URL" "$TEST_NOTIFICATION" "NOTIFICATION_SEND"
        ;;

    4)
        # Check all queues
        echo "Checking all queue statuses..."
        echo ""
        check_queue "$ORDER_QUEUE_URL" "Order Queue"
        check_queue "$PAYMENT_QUEUE_URL" "Payment Queue (FIFO)"
        check_queue "$NOTIFICATION_QUEUE_URL" "Notification Queue"
        check_queue "$DLQ_URL" "Dead Letter Queue"
        ;;

    5)
        # Receive messages
        receive_messages "$ORDER_QUEUE_URL"
        ;;

    6)
        # Full integration test
        echo "Running full integration test..."
        echo ""

        # 1. Send order message
        echo "Step 1: Creating test order..."
        TEST_ORDER=$(cat <<EOF
{
  "orderId": "integration-test-$(date +%s)",
  "userId": "user-123",
  "userEmail": "test@example.com",
  "items": [
    {
      "productId": "prod-001",
      "quantity": 1,
      "price": 99.99
    }
  ],
  "totalAmount": 99.99,
  "currency": "USD",
  "paymentMethod": "card",
  "timestamp": "$(date -Iseconds)"
}
EOF
)
        send_test_message "$ORDER_QUEUE_URL" "$TEST_ORDER" "ORDER_CREATED"

        # 2. Wait for processing
        echo "Step 2: Waiting for message processing (10 seconds)..."
        sleep 10

        # 3. Check queue status
        echo "Step 3: Checking queue status..."
        check_queue "$ORDER_QUEUE_URL" "Order Queue"
        check_queue "$PAYMENT_QUEUE_URL" "Payment Queue"
        check_queue "$NOTIFICATION_QUEUE_URL" "Notification Queue"

        # 4. Check DLQ
        echo "Step 4: Checking Dead Letter Queue for failed messages..."
        check_queue "$DLQ_URL" "Dead Letter Queue"

        echo "✓ Integration test complete!"
        echo ""
        echo "Next steps:"
        echo "1. Check payment service logs: pm2 logs payment-queue-worker"
        echo "2. Verify payment was processed in database"
        echo "3. Check notification service logs"
        ;;

    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo "========================================="
echo "Test Complete!"
echo "========================================="
echo ""
echo "Useful commands:"
echo "  Check queue: aws sqs get-queue-attributes --queue-url <url> --attribute-names All"
echo "  Purge queue: aws sqs purge-queue --queue-url <url>"
echo "  Delete message: aws sqs delete-message --queue-url <url> --receipt-handle <handle>"
echo ""
echo "Monitor worker logs:"
echo "  ssh to payment service EC2 and run: pm2 logs payment-queue-worker"
echo ""
