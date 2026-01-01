#!/bin/bash

# Get Database and Redis Endpoints
# Usage: ./get-db-endpoints.sh

set -e

# Load infrastructure configuration
if [ ! -f infrastructure-config.txt ]; then
    echo "Error: infrastructure-config.txt not found. Run setup-infrastructure.sh first."
    exit 1
fi

source infrastructure-config.txt

echo "========================================="
echo "Database and Cache Endpoints"
echo "========================================="
echo ""

# Get User DB endpoint
echo "User Service Database:"
USER_DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier ${PROJECT_NAME:-ecommerce}-user-db \
  --region $AWS_REGION \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text 2>/dev/null || echo "Not available")
echo "  Endpoint: $USER_DB_ENDPOINT"
echo "  Port: 5432"
echo "  Database: userdb"
echo ""

# Get Product DB endpoint
echo "Product Service Database:"
PRODUCT_DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier ${PROJECT_NAME:-ecommerce}-product-db \
  --region $AWS_REGION \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text 2>/dev/null || echo "Not available")
echo "  Endpoint: $PRODUCT_DB_ENDPOINT"
echo "  Port: 5432"
echo "  Database: productdb"
echo ""

# Get Order DB endpoint
echo "Order Service Database:"
ORDER_DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier ${PROJECT_NAME:-ecommerce}-order-db \
  --region $AWS_REGION \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text 2>/dev/null || echo "Not available")
echo "  Endpoint: $ORDER_DB_ENDPOINT"
echo "  Port: 5432"
echo "  Database: orderdb"
echo ""

# Get Payment DB endpoint
echo "Payment Service Database:"
PAYMENT_DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier ${PROJECT_NAME:-ecommerce}-payment-db \
  --region $AWS_REGION \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text 2>/dev/null || echo "Not available")
echo "  Endpoint: $PAYMENT_DB_ENDPOINT"
echo "  Port: 5432"
echo "  Database: paymentdb"
echo ""

# Get Notification DB endpoint
echo "Notification Service Database:"
NOTIFICATION_DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier ${PROJECT_NAME:-ecommerce}-notification-db \
  --region $AWS_REGION \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text 2>/dev/null || echo "Not available")
echo "  Endpoint: $NOTIFICATION_DB_ENDPOINT"
echo "  Port: 5432"
echo "  Database: notificationdb"
echo ""

# Get Redis endpoint
echo "Redis Cache:"
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id ${PROJECT_NAME:-ecommerce}-redis \
  --show-cache-node-info \
  --region $AWS_REGION \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
  --output text 2>/dev/null || echo "Not available")
echo "  Endpoint: $REDIS_ENDPOINT"
echo "  Port: 6379"
echo ""

# Save to file
cat > database-endpoints.txt << EOF
# Database Endpoints
USER_DB_ENDPOINT=$USER_DB_ENDPOINT
PRODUCT_DB_ENDPOINT=$PRODUCT_DB_ENDPOINT
ORDER_DB_ENDPOINT=$ORDER_DB_ENDPOINT
PAYMENT_DB_ENDPOINT=$PAYMENT_DB_ENDPOINT
NOTIFICATION_DB_ENDPOINT=$NOTIFICATION_DB_ENDPOINT
REDIS_ENDPOINT=$REDIS_ENDPOINT
EOF

echo "Endpoints saved to database-endpoints.txt"
echo ""
echo "Use these endpoints in your deployment scripts"
echo ""
