#!/bin/bash

# Deploy API Gateway to EC2 Instance
# Usage: ./deploy-api-gateway.sh <ec2-ip> <user-service-url> <product-service-url> <order-service-url> <payment-service-url> <notification-service-url>

set -e

EC2_IP=$1
USER_SERVICE_URL=$2
PRODUCT_SERVICE_URL=$3
ORDER_SERVICE_URL=$4
PAYMENT_SERVICE_URL=$5
NOTIFICATION_SERVICE_URL=$6
KEY_FILE="../danish-tokyo.pem"

if [ -z "$EC2_IP" ] || [ -z "$USER_SERVICE_URL" ] || [ -z "$PRODUCT_SERVICE_URL" ]; then
    echo "Usage: $0 <ec2-ip> <user-service-url> <product-service-url> <order-service-url> <payment-service-url> <notification-service-url>"
    echo "Example: $0 54.123.45.67 http://10.0.1.10:3001 http://10.0.1.20:3002 http://10.0.1.30:3003 http://10.0.1.40:3004 http://10.0.1.50:3005"
    echo ""
    echo "Note: Use internal/private IPs of EC2 instances or ALB URLs"
    exit 1
fi

echo "========================================="
echo "Deploying API Gateway"
echo "========================================="

scp -i "$KEY_FILE" -r ../ecommerce-microservices/api-gateway "ubuntu@$EC2_IP:/tmp/"

ssh -i "$KEY_FILE" "ubuntu@$EC2_IP" << ENDSSH
set -e

sudo rm -rf /opt/ecommerce/api-gateway
sudo mv /tmp/api-gateway /opt/ecommerce/
sudo chown -R ubuntu:ubuntu /opt/ecommerce/api-gateway

cd /opt/ecommerce/api-gateway

npm install --production

cat > .env << EOF
NODE_ENV=production
PORT=8080

# Microservice URLs
USER_SERVICE_URL=$USER_SERVICE_URL
PRODUCT_SERVICE_URL=$PRODUCT_SERVICE_URL
ORDER_SERVICE_URL=$ORDER_SERVICE_URL
PAYMENT_SERVICE_URL=$PAYMENT_SERVICE_URL
NOTIFICATION_SERVICE_URL=$NOTIFICATION_SERVICE_URL

# Service Configuration
SERVICE_NAME=api-gateway
LOG_LEVEL=info

# CORS Configuration
ALLOWED_ORIGINS=*
CORS_ENABLED=true

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
EOF

pm2 stop api-gateway || true
pm2 delete api-gateway || true

pm2 start src/server.js --name api-gateway \
  --max-memory-restart 500M \
  --instances 2 \
  --exec-mode cluster \
  --log /var/log/ecommerce/api-gateway.log \
  --error /var/log/ecommerce/api-gateway-error.log \
  --merge-logs \
  --time

pm2 save

echo ""
pm2 list
echo ""
sleep 5
curl -f http://localhost:8080/health || echo "Health check failed"

ENDSSH

echo ""
echo "========================================="
echo "API Gateway deployed successfully!"
echo "Service URL: http://$EC2_IP:8080"
echo "========================================="
echo ""
echo "Test the gateway:"
echo "  curl http://$EC2_IP:8080/api/users/health"
echo "  curl http://$EC2_IP:8080/api/products/health"
echo ""
