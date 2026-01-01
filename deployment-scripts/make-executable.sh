#!/bin/bash

# Make all deployment scripts executable
# Usage: ./make-executable.sh

echo "Making all scripts executable..."

chmod +x setup-infrastructure.sh
chmod +x create-databases.sh
chmod +x create-redis.sh
chmod +x get-db-endpoints.sh
chmod +x setup-instance.sh
chmod +x setup-alb.sh
chmod +x deploy-user-service.sh
chmod +x deploy-product-service.sh
chmod +x deploy-order-service.sh
chmod +x deploy-payment-service.sh
chmod +x deploy-notification-service.sh
chmod +x deploy-api-gateway.sh
chmod +x deploy-frontend.sh

echo "Done! All scripts are now executable."
echo ""
echo "Next steps:"
echo "1. Run ./setup-infrastructure.sh to create VPC and networking"
echo "2. Run ./create-databases.sh to create RDS instances"
echo "3. Run ./create-redis.sh to create Redis cache"
echo "4. Wait for resources, then run ./get-db-endpoints.sh"
echo "5. Launch EC2 instances and deploy services"
echo "6. Run ./setup-alb.sh to configure load balancer"
