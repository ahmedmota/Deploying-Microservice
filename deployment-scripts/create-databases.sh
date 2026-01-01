#!/bin/bash

# Create RDS PostgreSQL Instances
# Usage: ./create-databases.sh

set -e

# Load infrastructure configuration
if [ ! -f infrastructure-config.txt ]; then
    echo "Error: infrastructure-config.txt not found. Run setup-infrastructure.sh first."
    exit 1
fi

source infrastructure-config.txt

# Database Configuration
DB_USERNAME="postgres"
DB_PASSWORD="YourSecurePassword123"  # CHANGE THIS IN PRODUCTION
DB_INSTANCE_CLASS="db.t3.micro"
ALLOCATED_STORAGE=20

echo "========================================="
echo "Creating RDS PostgreSQL Instances"
echo "========================================="

# Create User Service Database
echo "Creating user-db..."
aws rds create-db-instance \
  --db-instance-identifier ${PROJECT_NAME:-ecommerce}-user-db \
  --db-instance-class $DB_INSTANCE_CLASS \
  --engine postgres \
  --engine-version 14.7 \
  --master-username $DB_USERNAME \
  --master-user-password $DB_PASSWORD \
  --allocated-storage $ALLOCATED_STORAGE \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name ${PROJECT_NAME:-ecommerce}-db-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --no-publicly-accessible \
  --storage-encrypted \
  --tags Key=Name,Value=${PROJECT_NAME:-ecommerce}-user-db Key=Service,Value=user-service \
  --region $AWS_REGION

echo "User DB creation initiated"

# Create Product Service Database
echo "Creating product-db..."
aws rds create-db-instance \
  --db-instance-identifier ${PROJECT_NAME:-ecommerce}-product-db \
  --db-instance-class $DB_INSTANCE_CLASS \
  --engine postgres \
  --engine-version 14.7 \
  --master-username $DB_USERNAME \
  --master-user-password $DB_PASSWORD \
  --allocated-storage $ALLOCATED_STORAGE \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name ${PROJECT_NAME:-ecommerce}-db-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --no-publicly-accessible \
  --storage-encrypted \
  --tags Key=Name,Value=${PROJECT_NAME:-ecommerce}-product-db Key=Service,Value=product-service \
  --region $AWS_REGION

echo "Product DB creation initiated"

# Create Order Service Database
echo "Creating order-db..."
aws rds create-db-instance \
  --db-instance-identifier ${PROJECT_NAME:-ecommerce}-order-db \
  --db-instance-class $DB_INSTANCE_CLASS \
  --engine postgres \
  --engine-version 14.7 \
  --master-username $DB_USERNAME \
  --master-user-password $DB_PASSWORD \
  --allocated-storage $ALLOCATED_STORAGE \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name ${PROJECT_NAME:-ecommerce}-db-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --no-publicly-accessible \
  --storage-encrypted \
  --tags Key=Name,Value=${PROJECT_NAME:-ecommerce}-order-db Key=Service,Value=order-service \
  --region $AWS_REGION

echo "Order DB creation initiated"

# Create Payment Service Database
echo "Creating payment-db..."
aws rds create-db-instance \
  --db-instance-identifier ${PROJECT_NAME:-ecommerce}-payment-db \
  --db-instance-class $DB_INSTANCE_CLASS \
  --engine postgres \
  --engine-version 14.7 \
  --master-username $DB_USERNAME \
  --master-user-password $DB_PASSWORD \
  --allocated-storage $ALLOCATED_STORAGE \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name ${PROJECT_NAME:-ecommerce}-db-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --no-publicly-accessible \
  --storage-encrypted \
  --tags Key=Name,Value=${PROJECT_NAME:-ecommerce}-payment-db Key=Service,Value=payment-service \
  --region $AWS_REGION

echo "Payment DB creation initiated"

# Create Notification Service Database
echo "Creating notification-db..."
aws rds create-db-instance \
  --db-instance-identifier ${PROJECT_NAME:-ecommerce}-notification-db \
  --db-instance-class $DB_INSTANCE_CLASS \
  --engine postgres \
  --engine-version 14.7 \
  --master-username $DB_USERNAME \
  --master-user-password $DB_PASSWORD \
  --allocated-storage $ALLOCATED_STORAGE \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name ${PROJECT_NAME:-ecommerce}-db-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --no-publicly-accessible \
  --storage-encrypted \
  --tags Key=Name,Value=${PROJECT_NAME:-ecommerce}-notification-db Key=Service,Value=notification-service \
  --region $AWS_REGION

echo "Notification DB creation initiated"

echo ""
echo "========================================="
echo "Database Creation Started"
echo "========================================="
echo ""
echo "Note: Database creation takes 10-15 minutes"
echo ""
echo "Check status with:"
echo "  aws rds describe-db-instances --region $AWS_REGION"
echo ""
echo "Wait for all databases to be 'available' before proceeding"
echo ""
echo "To get database endpoints when ready:"
echo "  ./get-db-endpoints.sh"
echo ""
