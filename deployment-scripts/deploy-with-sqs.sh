#!/bin/bash

# Deploy Services with SQS Integration
# This script updates existing services to use SQS

set -e

# Load SQS configuration
if [ ! -f sqs-config.txt ]; then
    echo "Error: sqs-config.txt not found. Run create-sqs-queues.sh first."
    exit 1
fi

source sqs-config.txt

KEY_FILE="../danish-tokyo.pem"

echo "========================================="
echo "Deploying Services with SQS Integration"
echo "========================================="
echo ""
echo "SQS Configuration:"
echo "  Order Queue: $ORDER_QUEUE_URL"
echo "  Payment Queue: $PAYMENT_QUEUE_URL"
echo "  Notification Queue: $NOTIFICATION_QUEUE_URL"
echo ""

# Function to update service with SQS env vars
update_service_with_sqs() {
    local SERVICE_NAME=$1
    local EC2_IP=$2
    local QUEUE_URLS=$3

    echo "Updating $SERVICE_NAME on $EC2_IP with SQS configuration..."

    ssh -i "$KEY_FILE" "ubuntu@$EC2_IP" << ENDSSH
set -e

# Navigate to service directory
cd /opt/ecommerce/$SERVICE_NAME

# Backup current .env
cp .env .env.backup.\$(date +%Y%m%d_%H%M%S)

# Update .env with SQS configuration
cat >> .env << EOF

# AWS SQS Configuration
AWS_REGION=$AWS_REGION
$QUEUE_URLS
EOF

echo "SQS configuration added to .env"

# Restart service to apply changes
pm2 restart $SERVICE_NAME
pm2 save

echo "$SERVICE_NAME restarted with SQS configuration"
ENDSSH

    echo "✓ $SERVICE_NAME updated successfully"
    echo ""
}

# Function to deploy SQS worker
deploy_sqs_worker() {
    local SERVICE_NAME=$1
    local EC2_IP=$2
    local WORKER_NAME=$3
    local WORKER_SCRIPT=$4

    echo "Deploying SQS worker '$WORKER_NAME' for $SERVICE_NAME..."

    ssh -i "$KEY_FILE" "ubuntu@$EC2_IP" << ENDSSH
set -e

cd /opt/ecommerce/$SERVICE_NAME

# Start SQS worker with PM2
if pm2 list | grep -q "$WORKER_NAME"; then
    echo "Worker already exists, restarting..."
    pm2 restart $WORKER_NAME
else
    echo "Starting new worker..."
    pm2 start $WORKER_SCRIPT --name $WORKER_NAME \
      --max-memory-restart 300M \
      --log /var/log/ecommerce/$WORKER_NAME.log \
      --error /var/log/ecommerce/$WORKER_NAME-error.log \
      --merge-logs \
      --time
fi

pm2 save

echo "Worker $WORKER_NAME deployed successfully"

# Verify worker is running
sleep 2
pm2 list | grep $WORKER_NAME

ENDSSH

    echo "✓ Worker $WORKER_NAME deployed successfully"
    echo ""
}

# Main deployment
echo "Choose deployment option:"
echo "1. Update Order Service with SQS"
echo "2. Update Payment Service with SQS and deploy worker"
echo "3. Update Notification Service with SQS and deploy worker"
echo "4. Update all services"
echo ""
read -p "Enter option (1-4): " OPTION

case $OPTION in
    1)
        read -p "Enter Order Service EC2 IP: " ORDER_IP
        update_service_with_sqs "order-service" "$ORDER_IP" "ORDER_QUEUE_URL=$ORDER_QUEUE_URL"
        ;;
    2)
        read -p "Enter Payment Service EC2 IP: " PAYMENT_IP
        update_service_with_sqs "payment-service" "$PAYMENT_IP" \
            "ORDER_QUEUE_URL=$ORDER_QUEUE_URL
PAYMENT_QUEUE_URL=$PAYMENT_QUEUE_URL
NOTIFICATION_QUEUE_URL=$NOTIFICATION_QUEUE_URL"

        # Deploy worker
        deploy_sqs_worker "payment-service" "$PAYMENT_IP" \
            "payment-queue-worker" \
            "src/workers/orderQueueWorker.js"
        ;;
    3)
        read -p "Enter Notification Service EC2 IP: " NOTIF_IP
        update_service_with_sqs "notification-service" "$NOTIF_IP" \
            "NOTIFICATION_QUEUE_URL=$NOTIFICATION_QUEUE_URL"

        # Deploy worker
        deploy_sqs_worker "notification-service" "$NOTIF_IP" \
            "notification-queue-worker" \
            "src/workers/notificationQueueWorker.js"
        ;;
    4)
        read -p "Enter Order Service EC2 IP: " ORDER_IP
        read -p "Enter Payment Service EC2 IP: " PAYMENT_IP
        read -p "Enter Notification Service EC2 IP: " NOTIF_IP

        # Update Order Service
        update_service_with_sqs "order-service" "$ORDER_IP" "ORDER_QUEUE_URL=$ORDER_QUEUE_URL"

        # Update Payment Service and deploy worker
        update_service_with_sqs "payment-service" "$PAYMENT_IP" \
            "ORDER_QUEUE_URL=$ORDER_QUEUE_URL
PAYMENT_QUEUE_URL=$PAYMENT_QUEUE_URL
NOTIFICATION_QUEUE_URL=$NOTIFICATION_QUEUE_URL"

        deploy_sqs_worker "payment-service" "$PAYMENT_IP" \
            "payment-queue-worker" \
            "src/workers/orderQueueWorker.js"

        # Update Notification Service and deploy worker
        update_service_with_sqs "notification-service" "$NOTIF_IP" \
            "NOTIFICATION_QUEUE_URL=$NOTIFICATION_QUEUE_URL"

        deploy_sqs_worker "notification-service" "$NOTIF_IP" \
            "notification-queue-worker" \
            "src/workers/notificationQueueWorker.js"
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "========================================="
echo "SQS Integration Deployment Complete!"
echo "========================================="
echo ""
echo "Verify deployment:"
echo "1. Check PM2 processes: ssh -i $KEY_FILE ubuntu@<ec2-ip> 'pm2 list'"
echo "2. Check worker logs: ssh -i $KEY_FILE ubuntu@<ec2-ip> 'pm2 logs <worker-name>'"
echo "3. Send test message: aws sqs send-message --queue-url $ORDER_QUEUE_URL --message-body '{\"test\":\"message\"}'"
echo "4. Monitor queue: aws sqs get-queue-attributes --queue-url $ORDER_QUEUE_URL --attribute-names All"
echo ""
