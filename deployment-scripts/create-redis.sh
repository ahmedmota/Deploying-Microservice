#!/bin/bash

# Create ElastiCache Redis Cluster
# Usage: ./create-redis.sh

set -e

# Load infrastructure configuration
if [ ! -f infrastructure-config.txt ]; then
    echo "Error: infrastructure-config.txt not found. Run setup-infrastructure.sh first."
    exit 1
fi

source infrastructure-config.txt

echo "========================================="
echo "Creating ElastiCache Redis Cluster"
echo "========================================="

# Create Redis Cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id ${PROJECT_NAME:-ecommerce}-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --security-group-ids $REDIS_SG_ID \
  --cache-subnet-group-name ${PROJECT_NAME:-ecommerce}-cache-subnet-group \
  --preferred-maintenance-window "sun:05:00-sun:06:00" \
  --snapshot-retention-limit 5 \
  --snapshot-window "03:00-04:00" \
  --tags Key=Name,Value=${PROJECT_NAME:-ecommerce}-redis Key=Environment,Value=production \
  --region $AWS_REGION

echo ""
echo "========================================="
echo "Redis Cluster Creation Started"
echo "========================================="
echo ""
echo "Note: Redis creation takes 5-10 minutes"
echo ""
echo "Check status with:"
echo "  aws elasticache describe-cache-clusters --cache-cluster-id ${PROJECT_NAME:-ecommerce}-redis --region $AWS_REGION"
echo ""
echo "To get Redis endpoint when ready:"
echo "  aws elasticache describe-cache-clusters --cache-cluster-id ${PROJECT_NAME:-ecommerce}-redis --show-cache-node-info --region $AWS_REGION --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' --output text"
echo ""
