#!/bin/bash

# Deploy User Service to EC2 Instance
# Usage: ./deploy-user-service.sh <ec2-ip> <db-host> <redis-host>

set -e

EC2_IP=$1
DB_HOST=$2
REDIS_HOST=$3
KEY_FILE="../danish-tokyo.pem"

if [ -z "$EC2_IP" ] || [ -z "$DB_HOST" ] || [ -z "$REDIS_HOST" ]; then
    echo "Usage: $0 <ec2-ip> <db-host> <redis-host>"
    echo "Example: $0 54.123.45.67 user-db.xxxxx.ap-southeast-1.rds.amazonaws.com redis.xxxxx.cache.amazonaws.com"
    exit 1
fi

echo "========================================="
echo "Deploying User Service"
echo "========================================="
echo "EC2 Instance: $EC2_IP"
echo "Database: $DB_HOST"
echo "Redis: $REDIS_HOST"
echo ""

# Copy service code to EC2
echo "Copying service code to EC2..."
scp -i "$KEY_FILE" -r ../ecommerce-microservices/services/user-service "ubuntu@$EC2_IP:/tmp/"

# Connect and deploy
echo "Connecting to EC2 and deploying..."
ssh -i "$KEY_FILE" "ubuntu@$EC2_IP" << ENDSSH
set -e

# Move service to app directory
sudo rm -rf /opt/ecommerce/user-service
sudo mv /tmp/user-service /opt/ecommerce/
sudo chown -R ubuntu:ubuntu /opt/ecommerce/user-service

# Navigate to service directory
cd /opt/ecommerce/user-service

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Create .env file
echo "Creating .env file..."
cat > .env << EOF
NODE_ENV=production
PORT=3001

# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=5432
DB_NAME=userdb
DB_USER=postgres
DB_PASSWORD=\${DB_PASSWORD:-postgres}

# Redis Configuration
REDIS_HOST=$REDIS_HOST
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=\${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}
JWT_REFRESH_SECRET=\${JWT_REFRESH_SECRET:-your-super-secret-refresh-key-change-in-production}
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# Service Configuration
SERVICE_NAME=user-service
LOG_LEVEL=info

# AWS Configuration (optional)
AWS_REGION=ap-southeast-1
EOF

# Run database migrations
echo "Running database migrations..."
npm run migrate || echo "Migration script not found or failed"

# Stop existing PM2 process if running
pm2 stop user-service || true
pm2 delete user-service || true

# Start service with PM2
echo "Starting user-service with PM2..."
pm2 start src/server.js --name user-service \
  --max-memory-restart 300M \
  --instances 2 \
  --exec-mode cluster \
  --log /var/log/ecommerce/user-service.log \
  --error /var/log/ecommerce/user-service-error.log \
  --merge-logs \
  --time

# Save PM2 configuration
pm2 save

# Check status
echo ""
echo "Service status:"
pm2 list

echo ""
echo "Testing health endpoint..."
sleep 5
curl -f http://localhost:3001/health || echo "Health check failed - service may still be starting"

ENDSSH

echo ""
echo "========================================="
echo "User Service deployed successfully!"
echo "========================================="
echo ""
echo "Service URL: http://$EC2_IP:3001"
echo ""
echo "Next steps:"
echo "1. Verify service is running: ssh -i $KEY_FILE ubuntu@$EC2_IP 'pm2 logs user-service'"
echo "2. Test health endpoint: curl http://$EC2_IP:3001/health"
echo "3. Register instance with ALB target group"
echo ""
