#!/bin/bash

# Deploy Notification Service to EC2 Instance
# Usage: ./deploy-notification-service.sh <ec2-ip> <db-host> <notification-queue-url>

set -e

EC2_IP=$1
DB_HOST=$2
NOTIFICATION_QUEUE_URL=$3
KEY_FILE="../danish-tokyo.pem"

if [ -z "$EC2_IP" ] || [ -z "$DB_HOST" ]; then
    echo "Usage: $0 <ec2-ip> <db-host> [notification-queue-url]"
    exit 1
fi

echo "========================================="
echo "Deploying Notification Service"
echo "========================================="

scp -i "$KEY_FILE" -r ../ecommerce-microservices/services/notification-service "ubuntu@$EC2_IP:/tmp/"

ssh -i "$KEY_FILE" "ubuntu@$EC2_IP" << ENDSSH
set -e

sudo rm -rf /opt/ecommerce/notification-service
sudo mv /tmp/notification-service /opt/ecommerce/
sudo chown -R ubuntu:ubuntu /opt/ecommerce/notification-service

cd /opt/ecommerce/notification-service

npm install --production

cat > .env << EOF
NODE_ENV=production
PORT=3005

DB_HOST=$DB_HOST
DB_PORT=5432
DB_NAME=notificationdb
DB_USER=postgres
DB_PASSWORD=\${DB_PASSWORD:-postgres}

SERVICE_NAME=notification-service
LOG_LEVEL=info

AWS_REGION=ap-southeast-1
NOTIFICATION_QUEUE_URL=$NOTIFICATION_QUEUE_URL

# Email Configuration
SMTP_HOST=\${SMTP_HOST:-smtp.gmail.com}
SMTP_PORT=\${SMTP_PORT:-587}
SMTP_USER=\${SMTP_USER:-your-email@gmail.com}
SMTP_PASS=\${SMTP_PASS:-your-app-password}
EMAIL_FROM=\${EMAIL_FROM:-noreply@example.com}
EOF

npm run migrate || echo "Migration script not found"

pm2 stop notification-service || true
pm2 delete notification-service || true

pm2 start src/server.js --name notification-service \
  --max-memory-restart 300M \
  --instances 2 \
  --exec-mode cluster \
  --log /var/log/ecommerce/notification-service.log \
  --error /var/log/ecommerce/notification-service-error.log \
  --merge-logs \
  --time

pm2 save

echo ""
pm2 list
echo ""
sleep 5
curl -f http://localhost:3005/health || echo "Health check failed"

ENDSSH

echo ""
echo "========================================="
echo "Notification Service deployed successfully!"
echo "Service URL: http://$EC2_IP:3005"
echo "========================================="
