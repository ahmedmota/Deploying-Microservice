#!/bin/bash

# Deploy Payment Service to EC2 Instance
# Usage: ./deploy-payment-service.sh <ec2-ip> <db-host> <payment-queue-url>

set -e

EC2_IP=$1
DB_HOST=$2
PAYMENT_QUEUE_URL=$3
KEY_FILE="../danish-tokyo.pem"

if [ -z "$EC2_IP" ] || [ -z "$DB_HOST" ]; then
    echo "Usage: $0 <ec2-ip> <db-host> [payment-queue-url]"
    exit 1
fi

echo "========================================="
echo "Deploying Payment Service"
echo "========================================="

scp -i "$KEY_FILE" -r ../ecommerce-microservices/services/payment-service "ubuntu@$EC2_IP:/tmp/"

ssh -i "$KEY_FILE" "ubuntu@$EC2_IP" << ENDSSH
set -e

sudo rm -rf /opt/ecommerce/payment-service
sudo mv /tmp/payment-service /opt/ecommerce/
sudo chown -R ubuntu:ubuntu /opt/ecommerce/payment-service

cd /opt/ecommerce/payment-service

npm install --production

cat > .env << EOF
NODE_ENV=production
PORT=3004

DB_HOST=$DB_HOST
DB_PORT=5432
DB_NAME=paymentdb
DB_USER=postgres
DB_PASSWORD=\${DB_PASSWORD:-postgres}

SERVICE_NAME=payment-service
LOG_LEVEL=info

AWS_REGION=ap-southeast-1
PAYMENT_QUEUE_URL=$PAYMENT_QUEUE_URL

# Payment Gateway Configuration (add your actual keys)
STRIPE_SECRET_KEY=\${STRIPE_SECRET_KEY:-sk_test_xxx}
STRIPE_PUBLISHABLE_KEY=\${STRIPE_PUBLISHABLE_KEY:-pk_test_xxx}
EOF

npm run migrate || echo "Migration script not found"

pm2 stop payment-service || true
pm2 delete payment-service || true

pm2 start src/server.js --name payment-service \
  --max-memory-restart 300M \
  --instances 2 \
  --exec-mode cluster \
  --log /var/log/ecommerce/payment-service.log \
  --error /var/log/ecommerce/payment-service-error.log \
  --merge-logs \
  --time

pm2 save

echo ""
pm2 list
echo ""
sleep 5
curl -f http://localhost:3004/health || echo "Health check failed"

ENDSSH

echo ""
echo "========================================="
echo "Payment Service deployed successfully!"
echo "Service URL: http://$EC2_IP:3004"
echo "========================================="
