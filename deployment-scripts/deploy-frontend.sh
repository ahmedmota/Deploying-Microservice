#!/bin/bash

# Deploy Frontend to EC2 Instance
# Usage: ./deploy-frontend.sh <ec2-ip> <api-gateway-url>

set -e

EC2_IP=$1
API_GATEWAY_URL=$2
KEY_FILE="../danish-tokyo.pem"

if [ -z "$EC2_IP" ] || [ -z "$API_GATEWAY_URL" ]; then
    echo "Usage: $0 <ec2-ip> <api-gateway-url>"
    echo "Example: $0 54.123.45.67 http://alb-url.amazonaws.com"
    exit 1
fi

echo "========================================="
echo "Deploying Frontend Application"
echo "========================================="

# Create .env file locally before building
cat > ../frontend/.env << EOF
REACT_APP_API_GATEWAY_URL=$API_GATEWAY_URL
EOF

# Build frontend locally (requires Node.js installed locally)
echo "Building frontend application..."
cd ../frontend
npm install
npm run build
cd ../deployment-scripts

# Copy built files to EC2
echo "Copying build files to EC2..."
scp -i "$KEY_FILE" -r ../frontend/build "ubuntu@$EC2_IP:/tmp/"
scp -i "$KEY_FILE" ../frontend/package.json "ubuntu@$EC2_IP:/tmp/"

ssh -i "$KEY_FILE" "ubuntu@$EC2_IP" << ENDSSH
set -e

sudo rm -rf /opt/ecommerce/frontend
sudo mkdir -p /opt/ecommerce/frontend
sudo mv /tmp/build /opt/ecommerce/frontend/
sudo mv /tmp/package.json /opt/ecommerce/frontend/
sudo chown -R ubuntu:ubuntu /opt/ecommerce/frontend

cd /opt/ecommerce/frontend

# Install serve package if not already installed
sudo npm install -g serve

pm2 stop frontend || true
pm2 delete frontend || true

# Serve the built React app
pm2 start "serve -s build -l 3000" --name frontend \
  --max-memory-restart 200M \
  --log /var/log/ecommerce/frontend.log \
  --error /var/log/ecommerce/frontend-error.log \
  --merge-logs \
  --time

pm2 save

echo ""
pm2 list
echo ""
sleep 5
curl -f http://localhost:3000 || echo "Health check failed"

ENDSSH

echo ""
echo "========================================="
echo "Frontend deployed successfully!"
echo "Service URL: http://$EC2_IP:3000"
echo "========================================="
echo ""
echo "Access your application at: http://$EC2_IP:3000"
echo ""
