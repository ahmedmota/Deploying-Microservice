#!/bin/bash

# Complete Infrastructure Setup Script
# This script automates the creation of VPC, subnets, security groups, and other AWS resources

set -e

# Configuration
AWS_REGION="ap-southeast-1"
PROJECT_NAME="ecommerce"
ENVIRONMENT="production"

# CIDR Blocks
VPC_CIDR="10.0.0.0/16"
PUBLIC_SUBNET_1_CIDR="10.0.1.0/24"
PUBLIC_SUBNET_2_CIDR="10.0.2.0/24"
PRIVATE_SUBNET_1_CIDR="10.0.11.0/24"
PRIVATE_SUBNET_2_CIDR="10.0.12.0/24"

# Availability Zones
AZ_1="${AWS_REGION}a"
AZ_2="${AWS_REGION}b"

# Database Configuration
DB_USERNAME="postgres"
DB_PASSWORD="YourSecurePassword123"  # CHANGE THIS IN PRODUCTION

echo "========================================="
echo "Infrastructure Setup for E-Commerce Platform"
echo "========================================="
echo "Region: $AWS_REGION"
echo "Environment: $ENVIRONMENT"
echo ""

# Create VPC
echo "Creating VPC..."
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block $VPC_CIDR \
  --region $AWS_REGION \
  --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=${PROJECT_NAME}-vpc},{Key=Environment,Value=${ENVIRONMENT}}]" \
  --query 'Vpc.VpcId' \
  --output text)

echo "VPC Created: $VPC_ID"

# Enable DNS hostname
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support

# Create Internet Gateway
echo "Creating Internet Gateway..."
IGW_ID=$(aws ec2 create-internet-gateway \
  --region $AWS_REGION \
  --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=${PROJECT_NAME}-igw},{Key=Environment,Value=${ENVIRONMENT}}]" \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

echo "Internet Gateway Created: $IGW_ID"

# Attach Internet Gateway to VPC
aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID --region $AWS_REGION
echo "Internet Gateway attached to VPC"

# Create Public Subnet 1
echo "Creating Public Subnet 1..."
PUBLIC_SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block $PUBLIC_SUBNET_1_CIDR \
  --availability-zone $AZ_1 \
  --region $AWS_REGION \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-subnet-1a},{Key=Environment,Value=${ENVIRONMENT}}]" \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Public Subnet 1 Created: $PUBLIC_SUBNET_1"

# Create Public Subnet 2
echo "Creating Public Subnet 2..."
PUBLIC_SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block $PUBLIC_SUBNET_2_CIDR \
  --availability-zone $AZ_2 \
  --region $AWS_REGION \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-subnet-1b},{Key=Environment,Value=${ENVIRONMENT}}]" \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Public Subnet 2 Created: $PUBLIC_SUBNET_2"

# Enable auto-assign public IP for public subnets
aws ec2 modify-subnet-attribute --subnet-id $PUBLIC_SUBNET_1 --map-public-ip-on-launch
aws ec2 modify-subnet-attribute --subnet-id $PUBLIC_SUBNET_2 --map-public-ip-on-launch

# Create Private Subnet 1
echo "Creating Private Subnet 1..."
PRIVATE_SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block $PRIVATE_SUBNET_1_CIDR \
  --availability-zone $AZ_1 \
  --region $AWS_REGION \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-subnet-1a},{Key=Environment,Value=${ENVIRONMENT}}]" \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Private Subnet 1 Created: $PRIVATE_SUBNET_1"

# Create Private Subnet 2
echo "Creating Private Subnet 2..."
PRIVATE_SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block $PRIVATE_SUBNET_2_CIDR \
  --availability-zone $AZ_2 \
  --region $AWS_REGION \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-subnet-1b},{Key=Environment,Value=${ENVIRONMENT}}]" \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Private Subnet 2 Created: $PRIVATE_SUBNET_2"

# Create Route Table for Public Subnets
echo "Creating Route Table..."
PUBLIC_RT=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-rt},{Key=Environment,Value=${ENVIRONMENT}}]" \
  --query 'RouteTable.RouteTableId' \
  --output text)

echo "Route Table Created: $PUBLIC_RT"

# Add route to Internet Gateway
aws ec2 create-route \
  --route-table-id $PUBLIC_RT \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID \
  --region $AWS_REGION

# Associate Route Table with Public Subnets
aws ec2 associate-route-table --subnet-id $PUBLIC_SUBNET_1 --route-table-id $PUBLIC_RT --region $AWS_REGION
aws ec2 associate-route-table --subnet-id $PUBLIC_SUBNET_2 --route-table-id $PUBLIC_RT --region $AWS_REGION

echo "Route table associated with public subnets"

# Create Security Group for ALB
echo "Creating Security Group for ALB..."
ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name ${PROJECT_NAME}-alb-sg \
  --description "Security group for Application Load Balancer" \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --output text)

aws ec2 create-tags --resources $ALB_SG_ID \
  --tags Key=Name,Value=${PROJECT_NAME}-alb-sg Key=Environment,Value=${ENVIRONMENT} \
  --region $AWS_REGION

# Allow HTTP and HTTPS from anywhere
aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $AWS_REGION

echo "ALB Security Group Created: $ALB_SG_ID"

# Create Security Group for EC2 Instances
echo "Creating Security Group for EC2 instances..."
EC2_SG_ID=$(aws ec2 create-security-group \
  --group-name ${PROJECT_NAME}-ec2-sg \
  --description "Security group for EC2 instances" \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --output text)

aws ec2 create-tags --resources $EC2_SG_ID \
  --tags Key=Name,Value=${PROJECT_NAME}-ec2-sg Key=Environment,Value=${ENVIRONMENT} \
  --region $AWS_REGION

# Allow SSH from your IP (you should replace 0.0.0.0/0 with your actual IP)
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $AWS_REGION

# Allow traffic from ALB
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 3001 --source-group $ALB_SG_ID --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 3002 --source-group $ALB_SG_ID --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 3003 --source-group $ALB_SG_ID --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 3004 --source-group $ALB_SG_ID --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 3005 --source-group $ALB_SG_ID --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 8080 --source-group $ALB_SG_ID --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 3000 --source-group $ALB_SG_ID --region $AWS_REGION

# Allow instances to communicate with each other
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol -1 --source-group $EC2_SG_ID --region $AWS_REGION

echo "EC2 Security Group Created: $EC2_SG_ID"

# Create Security Group for RDS
echo "Creating Security Group for RDS..."
RDS_SG_ID=$(aws ec2 create-security-group \
  --group-name ${PROJECT_NAME}-rds-sg \
  --description "Security group for RDS databases" \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --output text)

aws ec2 create-tags --resources $RDS_SG_ID \
  --tags Key=Name,Value=${PROJECT_NAME}-rds-sg Key=Environment,Value=${ENVIRONMENT} \
  --region $AWS_REGION

# Allow PostgreSQL from EC2 instances
aws ec2 authorize-security-group-ingress --group-id $RDS_SG_ID --protocol tcp --port 5432 --source-group $EC2_SG_ID --region $AWS_REGION

echo "RDS Security Group Created: $RDS_SG_ID"

# Create Security Group for Redis
echo "Creating Security Group for Redis..."
REDIS_SG_ID=$(aws ec2 create-security-group \
  --group-name ${PROJECT_NAME}-redis-sg \
  --description "Security group for Redis" \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --output text)

aws ec2 create-tags --resources $REDIS_SG_ID \
  --tags Key=Name,Value=${PROJECT_NAME}-redis-sg Key=Environment,Value=${ENVIRONMENT} \
  --region $AWS_REGION

# Allow Redis from EC2 instances
aws ec2 authorize-security-group-ingress --group-id $REDIS_SG_ID --protocol tcp --port 6379 --source-group $EC2_SG_ID --region $AWS_REGION

echo "Redis Security Group Created: $REDIS_SG_ID"

# Create DB Subnet Group
echo "Creating DB Subnet Group..."
aws rds create-db-subnet-group \
  --db-subnet-group-name ${PROJECT_NAME}-db-subnet-group \
  --db-subnet-group-description "Subnet group for RDS databases" \
  --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2 \
  --region $AWS_REGION \
  --tags Key=Name,Value=${PROJECT_NAME}-db-subnet-group Key=Environment,Value=${ENVIRONMENT}

echo "DB Subnet Group Created"

# Create Cache Subnet Group
echo "Creating Cache Subnet Group..."
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name ${PROJECT_NAME}-cache-subnet-group \
  --cache-subnet-group-description "Subnet group for Redis" \
  --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2 \
  --region $AWS_REGION \
  --tags Key=Name,Value=${PROJECT_NAME}-cache-subnet-group Key=Environment,Value=${ENVIRONMENT}

echo "Cache Subnet Group Created"

echo ""
echo "========================================="
echo "Infrastructure Setup Complete!"
echo "========================================="
echo ""
echo "VPC ID: $VPC_ID"
echo "Internet Gateway ID: $IGW_ID"
echo "Public Subnet 1: $PUBLIC_SUBNET_1 ($AZ_1)"
echo "Public Subnet 2: $PUBLIC_SUBNET_2 ($AZ_2)"
echo "Private Subnet 1: $PRIVATE_SUBNET_1 ($AZ_1)"
echo "Private Subnet 2: $PRIVATE_SUBNET_2 ($AZ_2)"
echo "ALB Security Group: $ALB_SG_ID"
echo "EC2 Security Group: $EC2_SG_ID"
echo "RDS Security Group: $RDS_SG_ID"
echo "Redis Security Group: $REDIS_SG_ID"
echo ""

# Save configuration to file
cat > infrastructure-config.txt << EOF
# Infrastructure Configuration
AWS_REGION=$AWS_REGION
VPC_ID=$VPC_ID
IGW_ID=$IGW_ID
PUBLIC_SUBNET_1=$PUBLIC_SUBNET_1
PUBLIC_SUBNET_2=$PUBLIC_SUBNET_2
PRIVATE_SUBNET_1=$PRIVATE_SUBNET_1
PRIVATE_SUBNET_2=$PRIVATE_SUBNET_2
PUBLIC_RT=$PUBLIC_RT
ALB_SG_ID=$ALB_SG_ID
EC2_SG_ID=$EC2_SG_ID
RDS_SG_ID=$RDS_SG_ID
REDIS_SG_ID=$REDIS_SG_ID
EOF

echo "Configuration saved to infrastructure-config.txt"
echo ""
echo "Next steps:"
echo "1. Create RDS instances using create-databases.sh"
echo "2. Create ElastiCache Redis using create-redis.sh"
echo "3. Launch EC2 instances for each service"
echo "4. Setup Application Load Balancer using setup-alb.sh"
echo ""
