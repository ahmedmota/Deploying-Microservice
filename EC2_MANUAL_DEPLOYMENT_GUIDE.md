# EC2 Manual Deployment Guide (Without Docker)

This guide covers deploying your microservices on EC2 instances with Application Load Balancer (ALB).

## Architecture Overview

```
Internet
    |
[Application Load Balancer]
    |
    +-- Target Group: API Gateway --> EC2 Instances (api-gateway)
    +-- Target Group: User Service --> EC2 Instances (user-service)
    +-- Target Group: Product Service --> EC2 Instances (product-service)
    +-- Target Group: Order Service --> EC2 Instances (order-service)
    +-- Target Group: Payment Service --> EC2 Instances (payment-service)
    +-- Target Group: Notification Service --> EC2 Instances (notification-service)
    +-- Target Group: Frontend --> EC2 Instances (frontend)
```

## Prerequisites

- AWS Account with appropriate permissions
- SSH key pair (.pem file)
- PostgreSQL RDS instances (or separate EC2 for databases)
- Redis ElastiCache (or EC2 with Redis)
- AWS CLI configured locally

---

## Phase 1: Infrastructure Setup

### 1.1 Create VPC and Subnets

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=ecommerce-vpc}]'

# Note the VPC ID (e.g., vpc-xxxxx)
VPC_ID="vpc-xxxxx"

# Create Internet Gateway
aws ec2 create-internet-gateway --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=ecommerce-igw}]'
IGW_ID="igw-xxxxx"

# Attach IGW to VPC
aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID

# Create Public Subnets (for ALB and EC2 instances)
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone ap-southeast-1a --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=public-subnet-1a}]'
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 --availability-zone ap-southeast-1b --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=public-subnet-1b}]'

# Create Private Subnets (for databases)
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.11.0/24 --availability-zone ap-southeast-1a --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=private-subnet-1a}]'
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.12.0/24 --availability-zone ap-southeast-1b --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=private-subnet-1b}]'

# Create Route Table for Public Subnets
aws ec2 create-route-table --vpc-id $VPC_ID --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=public-rt}]'
RT_ID="rtb-xxxxx"

# Add route to Internet Gateway
aws ec2 create-route --route-table-id $RT_ID --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID

# Associate subnets with route table
aws ec2 associate-route-table --subnet-id <public-subnet-1a-id> --route-table-id $RT_ID
aws ec2 associate-route-table --subnet-id <public-subnet-1b-id> --route-table-id $RT_ID
```

### 1.2 Create Security Groups

```bash
# Security Group for ALB
aws ec2 create-security-group \
  --group-name alb-sg \
  --description "Security group for Application Load Balancer" \
  --vpc-id $VPC_ID

ALB_SG_ID="sg-xxxxx"

# Allow HTTP and HTTPS from anywhere
aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0

# Security Group for EC2 instances
aws ec2 create-security-group \
  --group-name ec2-sg \
  --description "Security group for EC2 instances" \
  --vpc-id $VPC_ID

EC2_SG_ID="sg-yyyyy"

# Allow SSH from your IP
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 22 --cidr YOUR_IP/32

# Allow traffic from ALB
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 3001 --source-group $ALB_SG_ID
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 3002 --source-group $ALB_SG_ID
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 3003 --source-group $ALB_SG_ID
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 3004 --source-group $ALB_SG_ID
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 3005 --source-group $ALB_SG_ID
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 8080 --source-group $ALB_SG_ID
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 3000 --source-group $ALB_SG_ID

# Security Group for RDS
aws ec2 create-security-group \
  --group-name rds-sg \
  --description "Security group for RDS databases" \
  --vpc-id $VPC_ID

RDS_SG_ID="sg-zzzzz"

# Allow PostgreSQL from EC2 instances
aws ec2 authorize-security-group-ingress --group-id $RDS_SG_ID --protocol tcp --port 5432 --source-group $EC2_SG_ID

# Security Group for Redis
aws ec2 create-security-group \
  --group-name redis-sg \
  --description "Security group for Redis" \
  --vpc-id $VPC_ID

REDIS_SG_ID="sg-aaaaa"

# Allow Redis from EC2 instances
aws ec2 authorize-security-group-ingress --group-id $REDIS_SG_ID --protocol tcp --port 6379 --source-group $EC2_SG_ID
```

---

## Phase 2: Database Setup

### 2.1 Create RDS PostgreSQL Instances

```bash
# Create DB Subnet Group
aws rds create-db-subnet-group \
  --db-subnet-group-name ecommerce-db-subnet-group \
  --db-subnet-group-description "Subnet group for ecommerce databases" \
  --subnet-ids <private-subnet-1a-id> <private-subnet-1b-id>

# Create RDS instances for each service
# User Service DB
aws rds create-db-instance \
  --db-instance-identifier user-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password YourPassword123 \
  --allocated-storage 20 \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name ecommerce-db-subnet-group \
  --backup-retention-period 7 \
  --no-publicly-accessible

# Product Service DB
aws rds create-db-instance \
  --db-instance-identifier product-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password YourPassword123 \
  --allocated-storage 20 \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name ecommerce-db-subnet-group \
  --backup-retention-period 7 \
  --no-publicly-accessible

# Similarly create: order-db, payment-db, notification-db
```

### 2.2 Create ElastiCache Redis

```bash
# Create Cache Subnet Group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name ecommerce-cache-subnet-group \
  --cache-subnet-group-description "Subnet group for Redis" \
  --subnet-ids <private-subnet-1a-id> <private-subnet-1b-id>

# Create Redis Cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id ecommerce-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --security-group-ids $REDIS_SG_ID \
  --cache-subnet-group-name ecommerce-cache-subnet-group
```

---

## Phase 3: Launch EC2 Instances

### 3.1 Launch Instances for Each Service

You'll need separate EC2 instances for each service. For production, launch at least 2 instances per service for high availability.

```bash
# Launch User Service Instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --count 2 \
  --instance-type t3.small \
  --key-name your-key-pair \
  --security-group-ids $EC2_SG_ID \
  --subnet-id <public-subnet-1a-id> \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=user-service-1},{Key=Service,Value=user-service}]' \
  --user-data file://scripts/user-service-setup.sh

# Repeat for other services:
# - product-service (2 instances)
# - order-service (2 instances)
# - payment-service (2 instances)
# - notification-service (2 instances)
# - api-gateway (2 instances)
# - frontend (2 instances)
```

**Instance Summary:**
- **User Service**: 2x t3.small instances (port 3001)
- **Product Service**: 2x t3.small instances (port 3002)
- **Order Service**: 2x t3.small instances (port 3003)
- **Payment Service**: 2x t3.small instances (port 3004)
- **Notification Service**: 2x t3.small instances (port 3005)
- **API Gateway**: 2x t3.small instances (port 8080)
- **Frontend**: 2x t3.small instances (port 3000)

---

## Phase 4: Setup Application Load Balancer

### 4.1 Create Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name ecommerce-alb \
  --subnets <public-subnet-1a-id> <public-subnet-1b-id> \
  --security-groups $ALB_SG_ID \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4

# Note the ALB ARN
ALB_ARN="arn:aws:elasticloadbalancing:..."
```

### 4.2 Create Target Groups

```bash
# Target Group for User Service
aws elbv2 create-target-group \
  --name user-service-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id $VPC_ID \
  --health-check-enabled \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3

USER_TG_ARN="arn:aws:elasticloadbalancing:..."

# Target Group for Product Service
aws elbv2 create-target-group \
  --name product-service-tg \
  --protocol HTTP \
  --port 3002 \
  --vpc-id $VPC_ID \
  --health-check-enabled \
  --health-check-path /health \
  --health-check-interval-seconds 30

PRODUCT_TG_ARN="arn:aws:elasticloadbalancing:..."

# Similarly create target groups for:
# - order-service-tg (port 3003)
# - payment-service-tg (port 3004)
# - notification-service-tg (port 3005)
# - api-gateway-tg (port 8080)
# - frontend-tg (port 3000)
```

### 4.3 Register EC2 Instances with Target Groups

```bash
# Register User Service instances
aws elbv2 register-targets \
  --target-group-arn $USER_TG_ARN \
  --targets Id=<user-service-instance-1-id> Id=<user-service-instance-2-id>

# Register Product Service instances
aws elbv2 register-targets \
  --target-group-arn $PRODUCT_TG_ARN \
  --targets Id=<product-service-instance-1-id> Id=<product-service-instance-2-id>

# Repeat for all other services
```

### 4.4 Create ALB Listeners and Rules

```bash
# Create HTTP Listener (redirect to HTTPS in production)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$FRONTEND_TG_ARN

LISTENER_ARN="arn:aws:elasticloadbalancing:..."

# Create routing rules
# Route /api/users/* to user-service
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 1 \
  --conditions Field=path-pattern,Values='/api/users/*' \
  --actions Type=forward,TargetGroupArn=$USER_TG_ARN

# Route /api/products/* to product-service
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 2 \
  --conditions Field=path-pattern,Values='/api/products/*' \
  --actions Type=forward,TargetGroupArn=$PRODUCT_TG_ARN

# Route /api/orders/* to order-service
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 3 \
  --conditions Field=path-pattern,Values='/api/orders/*' \
  --actions Type=forward,TargetGroupArn=$ORDER_TG_ARN

# Route /api/payments/* to payment-service
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 4 \
  --conditions Field=path-pattern,Values='/api/payments/*' \
  --actions Type=forward,TargetGroupArn=$PAYMENT_TG_ARN

# Route /api/notifications/* to notification-service
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 5 \
  --conditions Field=path-pattern,Values='/api/notifications/*' \
  --actions Type=forward,TargetGroupArn=$NOTIFICATION_TG_ARN

# Route /api/* to api-gateway (catch-all for other API routes)
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 6 \
  --conditions Field=path-pattern,Values='/api/*' \
  --actions Type=forward,TargetGroupArn=$API_GATEWAY_TG_ARN
```

---

## Phase 5: Deploy Application on EC2

### 5.1 SSH into Each EC2 Instance

```bash
# SSH into instance
ssh -i danish-tokyo.pem ubuntu@<ec2-public-ip>
```

### 5.2 Install Dependencies (Run on each instance)

See `scripts/setup-instance.sh` for automated setup script.

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Git
sudo apt install -y git

# Install build essentials
sudo apt install -y build-essential
```

### 5.3 Deploy Service Code

```bash
# Create app directory
sudo mkdir -p /opt/ecommerce
sudo chown ubuntu:ubuntu /opt/ecommerce
cd /opt/ecommerce

# Clone or copy your code
git clone <your-repo-url> .
# OR use SCP to copy files
# scp -i danish-tokyo.pem -r ./ecommerce-microservices ubuntu@<ec2-ip>:/opt/ecommerce/

# For User Service instance:
cd /opt/ecommerce/ecommerce-microservices/services/user-service

# Install dependencies
npm install --production

# Create .env file
cat > .env << EOF
NODE_ENV=production
PORT=3001
DB_HOST=<user-db-endpoint>.ap-southeast-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=userdb
DB_USER=postgres
DB_PASSWORD=YourPassword123
REDIS_HOST=<redis-endpoint>
REDIS_PORT=6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
EOF

# Run database migrations
npm run migrate

# Start with PM2
pm2 start src/server.js --name user-service
pm2 save
pm2 startup
```

### 5.4 Repeat for All Services

Apply similar steps for each service on their respective instances:

**Product Service** (port 3002):
```bash
cd /opt/ecommerce/ecommerce-microservices/services/product-service
npm install --production
# Create .env with product-db credentials
npm run migrate
pm2 start src/server.js --name product-service
```

**Order Service** (port 3003):
```bash
cd /opt/ecommerce/ecommerce-microservices/services/order-service
npm install --production
# Create .env with order-db credentials
pm2 start src/server.js --name order-service
```

**Payment Service** (port 3004):
```bash
cd /opt/ecommerce/ecommerce-microservices/services/payment-service
npm install --production
# Create .env with payment-db credentials
pm2 start src/server.js --name payment-service
```

**Notification Service** (port 3005):
```bash
cd /opt/ecommerce/ecommerce-microservices/services/notification-service
npm install --production
# Create .env with notification-db credentials
pm2 start src/server.js --name notification-service
```

**API Gateway** (port 8080):
```bash
cd /opt/ecommerce/ecommerce-microservices/api-gateway
npm install --production
# Create .env with service URLs pointing to internal IPs or ALB
pm2 start src/server.js --name api-gateway
```

**Frontend** (port 3000):
```bash
cd /opt/ecommerce/frontend
npm install
npm run build
# Serve with PM2 using serve package
sudo npm install -g serve
pm2 start "serve -s build -l 3000" --name frontend
```

---

## Phase 6: Monitoring and Management

### 6.1 PM2 Monitoring

```bash
# View all processes
pm2 list

# View logs
pm2 logs user-service

# Monitor resources
pm2 monit

# Restart service
pm2 restart user-service

# Stop service
pm2 stop user-service
```

### 6.2 CloudWatch Monitoring

Install CloudWatch agent on each EC2 instance:

```bash
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

### 6.3 Application Health Checks

Each service should have a `/health` endpoint. The ALB will automatically route traffic only to healthy instances.

---

## Phase 7: Auto Scaling (Optional)

### 7.1 Create Launch Templates

```bash
# Create launch template for user-service
aws ec2 create-launch-template \
  --launch-template-name user-service-template \
  --version-description "User service template" \
  --launch-template-data '{
    "ImageId": "ami-xxxxx",
    "InstanceType": "t3.small",
    "KeyName": "your-key-pair",
    "SecurityGroupIds": ["'$EC2_SG_ID'"],
    "UserData": "'$(base64 -w 0 scripts/user-service-setup.sh)'"
  }'
```

### 7.2 Create Auto Scaling Groups

```bash
# Create Auto Scaling Group for user-service
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name user-service-asg \
  --launch-template LaunchTemplateName=user-service-template,Version=1 \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 2 \
  --target-group-arns $USER_TG_ARN \
  --vpc-zone-identifier "<public-subnet-1a-id>,<public-subnet-1b-id>" \
  --health-check-type ELB \
  --health-check-grace-period 300

# Create scaling policies
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name user-service-asg \
  --policy-name scale-up \
  --scaling-adjustment 1 \
  --adjustment-type ChangeInCapacity \
  --cooldown 300
```

---

## Phase 8: SSL/TLS Setup (Production)

### 8.1 Request SSL Certificate

```bash
# Request certificate from ACM
aws acm request-certificate \
  --domain-name ecommerce.example.com \
  --validation-method DNS \
  --subject-alternative-names www.ecommerce.example.com
```

### 8.2 Create HTTPS Listener

```bash
# Create HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<acm-certificate-arn> \
  --default-actions Type=forward,TargetGroupArn=$FRONTEND_TG_ARN

# Update HTTP listener to redirect to HTTPS
aws elbv2 modify-listener \
  --listener-arn $LISTENER_ARN \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'
```

---

## Deployment Checklist

- [ ] VPC and subnets created
- [ ] Security groups configured
- [ ] RDS instances created and accessible
- [ ] Redis ElastiCache created
- [ ] EC2 instances launched for all services
- [ ] Application Load Balancer created
- [ ] Target groups created and instances registered
- [ ] Listener rules configured
- [ ] Applications deployed and running on EC2
- [ ] PM2 configured for process management
- [ ] Health checks passing
- [ ] CloudWatch monitoring enabled
- [ ] SSL certificate configured (production)
- [ ] Auto Scaling Groups configured (optional)
- [ ] Backup strategy implemented

---

## Common Commands Reference

### PM2 Commands
```bash
pm2 list                    # List all processes
pm2 logs <app-name>         # View logs
pm2 restart <app-name>      # Restart app
pm2 stop <app-name>         # Stop app
pm2 delete <app-name>       # Remove app
pm2 save                    # Save current process list
pm2 startup                 # Generate startup script
pm2 monit                   # Monitor resources
```

### AWS CLI Commands
```bash
# Check ALB status
aws elbv2 describe-load-balancers

# Check target health
aws elbv2 describe-target-health --target-group-arn $TG_ARN

# View EC2 instances
aws ec2 describe-instances --filters "Name=tag:Service,Values=user-service"

# View RDS instances
aws rds describe-db-instances
```

---

## Troubleshooting

### Issue: Target failing health checks
```bash
# Check target health
aws elbv2 describe-target-health --target-group-arn $TG_ARN

# SSH to instance and check service
ssh -i danish-tokyo.pem ubuntu@<ec2-ip>
pm2 logs <service-name>
curl http://localhost:3001/health
```

### Issue: Cannot connect to database
```bash
# Check security group allows connection
# Test from EC2 instance
psql -h <rds-endpoint> -U postgres -d userdb
```

### Issue: High latency
```bash
# Check CloudWatch metrics
# Enable caching in Redis
# Optimize database queries
# Add more EC2 instances
```

---

## Cost Optimization

1. **Use Reserved Instances** for predictable workloads
2. **Use Spot Instances** for non-critical services
3. **Right-size instances** based on CloudWatch metrics
4. **Enable auto-scaling** to handle traffic variations
5. **Use RDS read replicas** instead of increasing instance size
6. **Enable CloudFront** for static assets
7. **Set up budget alerts** in AWS Cost Explorer

---

## Next Steps

1. Set up CI/CD pipeline (GitHub Actions, Jenkins, CodePipeline)
2. Implement blue-green deployment
3. Add WAF for security
4. Set up Route 53 for DNS management
5. Enable CloudFront CDN
6. Implement comprehensive logging with ELK stack
7. Set up disaster recovery in another region

---

This deployment approach gives you full control over the infrastructure while maintaining high availability and scalability. Each service runs independently on dedicated EC2 instances, making it easier to scale individual services based on demand.
