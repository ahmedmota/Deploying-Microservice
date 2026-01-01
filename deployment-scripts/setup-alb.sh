#!/bin/bash

# Setup Application Load Balancer and Target Groups
# This script creates ALB, target groups, and listener rules for the microservices

set -e

# Configuration - UPDATE THESE VALUES
VPC_ID="vpc-xxxxx"
SUBNET_1="subnet-xxxxx"  # Public subnet in AZ 1
SUBNET_2="subnet-yyyyy"  # Public subnet in AZ 2
ALB_SG_ID="sg-xxxxx"     # Security group for ALB

# EC2 Instance IDs - UPDATE THESE
USER_SERVICE_INSTANCE_1="i-xxxxx"
USER_SERVICE_INSTANCE_2="i-yyyyy"
PRODUCT_SERVICE_INSTANCE_1="i-xxxxx"
PRODUCT_SERVICE_INSTANCE_2="i-yyyyy"
ORDER_SERVICE_INSTANCE_1="i-xxxxx"
ORDER_SERVICE_INSTANCE_2="i-yyyyy"
PAYMENT_SERVICE_INSTANCE_1="i-xxxxx"
PAYMENT_SERVICE_INSTANCE_2="i-yyyyy"
NOTIFICATION_SERVICE_INSTANCE_1="i-xxxxx"
NOTIFICATION_SERVICE_INSTANCE_2="i-yyyyy"
API_GATEWAY_INSTANCE_1="i-xxxxx"
API_GATEWAY_INSTANCE_2="i-yyyyy"
FRONTEND_INSTANCE_1="i-xxxxx"
FRONTEND_INSTANCE_2="i-yyyyy"

echo "========================================="
echo "Setting up Application Load Balancer"
echo "========================================="

# Create Application Load Balancer
echo "Creating Application Load Balancer..."
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name ecommerce-alb \
  --subnets $SUBNET_1 $SUBNET_2 \
  --security-groups $ALB_SG_ID \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --tags Key=Name,Value=ecommerce-alb Key=Environment,Value=production \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

echo "ALB Created: $ALB_ARN"

# Wait for ALB to be active
echo "Waiting for ALB to be active..."
aws elbv2 wait load-balancer-available --load-balancer-arns $ALB_ARN

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "ALB DNS: $ALB_DNS"

# Create Target Groups
echo ""
echo "Creating Target Groups..."

# User Service Target Group
echo "Creating user-service target group..."
USER_TG_ARN=$(aws elbv2 create-target-group \
  --name user-service-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id $VPC_ID \
  --health-check-enabled \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Product Service Target Group
echo "Creating product-service target group..."
PRODUCT_TG_ARN=$(aws elbv2 create-target-group \
  --name product-service-tg \
  --protocol HTTP \
  --port 3002 \
  --vpc-id $VPC_ID \
  --health-check-enabled \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Order Service Target Group
echo "Creating order-service target group..."
ORDER_TG_ARN=$(aws elbv2 create-target-group \
  --name order-service-tg \
  --protocol HTTP \
  --port 3003 \
  --vpc-id $VPC_ID \
  --health-check-enabled \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Payment Service Target Group
echo "Creating payment-service target group..."
PAYMENT_TG_ARN=$(aws elbv2 create-target-group \
  --name payment-service-tg \
  --protocol HTTP \
  --port 3004 \
  --vpc-id $VPC_ID \
  --health-check-enabled \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Notification Service Target Group
echo "Creating notification-service target group..."
NOTIFICATION_TG_ARN=$(aws elbv2 create-target-group \
  --name notification-svc-tg \
  --protocol HTTP \
  --port 3005 \
  --vpc-id $VPC_ID \
  --health-check-enabled \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# API Gateway Target Group
echo "Creating api-gateway target group..."
API_GATEWAY_TG_ARN=$(aws elbv2 create-target-group \
  --name api-gateway-tg \
  --protocol HTTP \
  --port 8080 \
  --vpc-id $VPC_ID \
  --health-check-enabled \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Frontend Target Group
echo "Creating frontend target group..."
FRONTEND_TG_ARN=$(aws elbv2 create-target-group \
  --name frontend-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --health-check-enabled \
  --health-check-path / \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "All target groups created!"

# Register instances with target groups
echo ""
echo "Registering EC2 instances with target groups..."

if [ "$USER_SERVICE_INSTANCE_1" != "i-xxxxx" ]; then
  aws elbv2 register-targets --target-group-arn $USER_TG_ARN \
    --targets Id=$USER_SERVICE_INSTANCE_1 Id=$USER_SERVICE_INSTANCE_2
  echo "User service instances registered"
fi

if [ "$PRODUCT_SERVICE_INSTANCE_1" != "i-xxxxx" ]; then
  aws elbv2 register-targets --target-group-arn $PRODUCT_TG_ARN \
    --targets Id=$PRODUCT_SERVICE_INSTANCE_1 Id=$PRODUCT_SERVICE_INSTANCE_2
  echo "Product service instances registered"
fi

if [ "$ORDER_SERVICE_INSTANCE_1" != "i-xxxxx" ]; then
  aws elbv2 register-targets --target-group-arn $ORDER_TG_ARN \
    --targets Id=$ORDER_SERVICE_INSTANCE_1 Id=$ORDER_SERVICE_INSTANCE_2
  echo "Order service instances registered"
fi

if [ "$PAYMENT_SERVICE_INSTANCE_1" != "i-xxxxx" ]; then
  aws elbv2 register-targets --target-group-arn $PAYMENT_TG_ARN \
    --targets Id=$PAYMENT_SERVICE_INSTANCE_1 Id=$PAYMENT_SERVICE_INSTANCE_2
  echo "Payment service instances registered"
fi

if [ "$NOTIFICATION_SERVICE_INSTANCE_1" != "i-xxxxx" ]; then
  aws elbv2 register-targets --target-group-arn $NOTIFICATION_TG_ARN \
    --targets Id=$NOTIFICATION_SERVICE_INSTANCE_1 Id=$NOTIFICATION_SERVICE_INSTANCE_2
  echo "Notification service instances registered"
fi

if [ "$API_GATEWAY_INSTANCE_1" != "i-xxxxx" ]; then
  aws elbv2 register-targets --target-group-arn $API_GATEWAY_TG_ARN \
    --targets Id=$API_GATEWAY_INSTANCE_1 Id=$API_GATEWAY_INSTANCE_2
  echo "API Gateway instances registered"
fi

if [ "$FRONTEND_INSTANCE_1" != "i-xxxxx" ]; then
  aws elbv2 register-targets --target-group-arn $FRONTEND_TG_ARN \
    --targets Id=$FRONTEND_INSTANCE_1 Id=$FRONTEND_INSTANCE_2
  echo "Frontend instances registered"
fi

# Create HTTP Listener
echo ""
echo "Creating HTTP listener..."
LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$FRONTEND_TG_ARN \
  --query 'Listeners[0].ListenerArn' \
  --output text)

echo "Listener created: $LISTENER_ARN"

# Create Listener Rules for path-based routing
echo ""
echo "Creating listener rules for path-based routing..."

# Priority 1: /api/users/* -> user-service
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 1 \
  --conditions Field=path-pattern,Values='/api/users/*' \
  --actions Type=forward,TargetGroupArn=$USER_TG_ARN

# Priority 2: /api/auth/* -> user-service
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 2 \
  --conditions Field=path-pattern,Values='/api/auth/*' \
  --actions Type=forward,TargetGroupArn=$USER_TG_ARN

# Priority 3: /api/products/* -> product-service
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 3 \
  --conditions Field=path-pattern,Values='/api/products/*' \
  --actions Type=forward,TargetGroupArn=$PRODUCT_TG_ARN

# Priority 4: /api/categories/* -> product-service
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 4 \
  --conditions Field=path-pattern,Values='/api/categories/*' \
  --actions Type=forward,TargetGroupArn=$PRODUCT_TG_ARN

# Priority 5: /api/orders/* -> order-service
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 5 \
  --conditions Field=path-pattern,Values='/api/orders/*' \
  --actions Type=forward,TargetGroupArn=$ORDER_TG_ARN

# Priority 6: /api/payments/* -> payment-service
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 6 \
  --conditions Field=path-pattern,Values='/api/payments/*' \
  --actions Type=forward,TargetGroupArn=$PAYMENT_TG_ARN

# Priority 7: /api/notifications/* -> notification-service
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 7 \
  --conditions Field=path-pattern,Values='/api/notifications/*' \
  --actions Type=forward,TargetGroupArn=$NOTIFICATION_TG_ARN

# Priority 8: /api/* -> api-gateway (catch-all)
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 8 \
  --conditions Field=path-pattern,Values='/api/*' \
  --actions Type=forward,TargetGroupArn=$API_GATEWAY_TG_ARN

echo "Listener rules created!"

# Check target health
echo ""
echo "Checking target health (this may take a few moments)..."
sleep 10

echo ""
echo "User Service Target Health:"
aws elbv2 describe-target-health --target-group-arn $USER_TG_ARN --output table

echo ""
echo "Product Service Target Health:"
aws elbv2 describe-target-health --target-group-arn $PRODUCT_TG_ARN --output table

echo ""
echo "========================================="
echo "ALB Setup Complete!"
echo "========================================="
echo ""
echo "ALB DNS Name: $ALB_DNS"
echo "Access your application at: http://$ALB_DNS"
echo ""
echo "Endpoints:"
echo "  Frontend:              http://$ALB_DNS/"
echo "  User Service:          http://$ALB_DNS/api/users/"
echo "  Product Service:       http://$ALB_DNS/api/products/"
echo "  Order Service:         http://$ALB_DNS/api/orders/"
echo "  Payment Service:       http://$ALB_DNS/api/payments/"
echo "  Notification Service:  http://$ALB_DNS/api/notifications/"
echo ""
echo "Note: Make sure all services have /health endpoints for health checks"
echo ""
echo "To enable HTTPS, run the SSL setup script: ./setup-ssl.sh"
echo ""
