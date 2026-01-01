#!/bin/bash

# Deploy Order Service to EC2 Instance
# Usage: ./deploy-order-service.sh <ec2-ip> <db-host> <product-service-url> <sqs-queue-url>

set -e

EC2_IP=$1
DB_HOST=$2
PRODUCT_SERVICE_URL=$3
ORDER_QUEUE_URL=$4
KEY_FILE="../danish-tokyo.pem"

if [ -z "$EC2_IP" ] || [ -z "$DB_HOST" ] || [ -z "$PRODUCT_SERVICE_URL" ]; then
    echo "Usage: $0 <ec2-ip> <db-host> <product-service-url> [sqs-queue-url]"
    echo "Example: $0 54.123.45.67 order-db.xxxxx.rds.amazonaws.com http://product-alb/api https://sqs.ap-southeast-1.amazonaws.com/xxx/order-queue"
    exit 1
fi

echo "========================================="
echo "Deploying Order Service"
echo "========================================="

scp -i "$KEY_FILE" -r ../ecommerce-microservices/services/order-service "ubuntu@$EC2_IP:/tmp/"

ssh -i "$KEY_FILE" "ubuntu@$EC2_IP" << ENDSSH
set -e

sudo rm -rf /opt/ecommerce/order-service
sudo mv /tmp/order-service /opt/ecommerce/
sudo chown -R ubuntu:ubuntu /opt/ecommerce/order-service

cd /opt/ecommerce/order-service

npm install --production

cat > .env << EOF
NODE_ENV=production
PORT=3003

DB_HOST=$DB_HOST
DB_PORT=5432
DB_NAME=orderdb
DB_USER=postgres
DB_PASSWORD=\${DB_PASSWORD:-postgres}

PRODUCT_SERVICE_URL=$PRODUCT_SERVICE_URL

SERVICE_NAME=order-service
LOG_LEVEL=info

AWS_REGION=ap-southeast-1
ORDER_QUEUE_URL=$ORDER_QUEUE_URL
EOF

npm run migrate || echo "Migration script not found"

pm2 stop order-service || true
pm2 delete order-service || true

pm2 start src/server.js --name order-service \
  --max-memory-restart 300M \
  --instances 2 \
  --exec-mode cluster \
  --log /var/log/ecommerce/order-service.log \
  --error /var/log/ecommerce/order-service-error.log \
  --merge-logs \
  --time

pm2 save

echo ""
pm2 list
echo ""
sleep 5
curl -f http://localhost:3003/health || echo "Health check failed"

ENDSSH

echo ""
echo "========================================="
echo "Order Service deployed successfully!"
echo "Service URL: http://$EC2_IP:3003"
echo "========================================="
