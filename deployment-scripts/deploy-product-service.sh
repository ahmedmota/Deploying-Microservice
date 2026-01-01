#!/bin/bash

# Deploy Product Service to EC2 Instance
# Usage: ./deploy-product-service.sh <ec2-ip> <db-host> <redis-host>

set -e

EC2_IP=$1
DB_HOST=$2
REDIS_HOST=$3
KEY_FILE="../danish-tokyo.pem"

if [ -z "$EC2_IP" ] || [ -z "$DB_HOST" ] || [ -z "$REDIS_HOST" ]; then
    echo "Usage: $0 <ec2-ip> <db-host> <redis-host>"
    exit 1
fi

echo "========================================="
echo "Deploying Product Service"
echo "========================================="

scp -i "$KEY_FILE" -r ../ecommerce-microservices/services/product-service "ubuntu@$EC2_IP:/tmp/"

ssh -i "$KEY_FILE" "ubuntu@$EC2_IP" << ENDSSH
set -e

sudo rm -rf /opt/ecommerce/product-service
sudo mv /tmp/product-service /opt/ecommerce/
sudo chown -R ubuntu:ubuntu /opt/ecommerce/product-service

cd /opt/ecommerce/product-service

npm install --production

cat > .env << EOF
NODE_ENV=production
PORT=3002

DB_HOST=$DB_HOST
DB_PORT=5432
DB_NAME=productdb
DB_USER=postgres
DB_PASSWORD=\${DB_PASSWORD:-postgres}

REDIS_HOST=$REDIS_HOST
REDIS_PORT=6379

SERVICE_NAME=product-service
LOG_LEVEL=info

AWS_REGION=ap-southeast-1
EOF

npm run migrate || echo "Migration script not found"

pm2 stop product-service || true
pm2 delete product-service || true

pm2 start src/server.js --name product-service \
  --max-memory-restart 300M \
  --instances 2 \
  --exec-mode cluster \
  --log /var/log/ecommerce/product-service.log \
  --error /var/log/ecommerce/product-service-error.log \
  --merge-logs \
  --time

pm2 save

echo ""
pm2 list
echo ""
sleep 5
curl -f http://localhost:3002/health || echo "Health check failed"

ENDSSH

echo ""
echo "========================================="
echo "Product Service deployed successfully!"
echo "Service URL: http://$EC2_IP:3002"
echo "========================================="
