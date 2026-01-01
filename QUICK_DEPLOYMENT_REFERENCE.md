# Quick Deployment Reference

## EC2 Manual Deployment - Command Cheat Sheet

### Initial Setup (One-time)

```bash
cd deployment-scripts

# 1. Make scripts executable
chmod +x *.sh
# or
./make-executable.sh

# 2. Setup infrastructure (VPC, subnets, security groups)
./setup-infrastructure.sh

# 3. Create databases (10-15 min wait)
./create-databases.sh

# 4. Create Redis cache (5-10 min wait)
./create-redis.sh

# 5. Get database endpoints (run after DBs are ready)
./get-db-endpoints.sh
```

### Launch EC2 Instances

You need **14 EC2 instances** total (2 per service for HA):

```bash
# Load the config file to get security group and subnet IDs
source infrastructure-config.txt

# Launch instances for each service
# Replace ami-xxxxx with your region's Ubuntu 20.04 AMI
# Replace your-key-pair with your SSH key pair name

# User Service (2 instances)
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --count 2 \
  --instance-type t3.small \
  --key-name your-key-pair \
  --security-group-ids $EC2_SG_ID \
  --subnet-id $PUBLIC_SUBNET_1 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=user-service},{Key=Service,Value=user}]'

# Repeat for: product, order, payment, notification, api-gateway, frontend
```

### Setup Each EC2 Instance

```bash
# Get EC2 public IP
EC2_IP="<instance-public-ip>"

# Copy and run setup script
scp -i ../danish-tokyo.pem setup-instance.sh ubuntu@$EC2_IP:/home/ubuntu/
ssh -i ../danish-tokyo.pem ubuntu@$EC2_IP 'bash setup-instance.sh'
```

### Deploy Services

```bash
# Load database endpoints
source database-endpoints.txt

# Deploy User Service
./deploy-user-service.sh <user-ec2-ip-1> $USER_DB_ENDPOINT $REDIS_ENDPOINT
./deploy-user-service.sh <user-ec2-ip-2> $USER_DB_ENDPOINT $REDIS_ENDPOINT

# Deploy Product Service
./deploy-product-service.sh <product-ec2-ip-1> $PRODUCT_DB_ENDPOINT $REDIS_ENDPOINT
./deploy-product-service.sh <product-ec2-ip-2> $PRODUCT_DB_ENDPOINT $REDIS_ENDPOINT

# Deploy Order Service
./deploy-order-service.sh <order-ec2-ip-1> $ORDER_DB_ENDPOINT http://<product-ec2-ip>:3002
./deploy-order-service.sh <order-ec2-ip-2> $ORDER_DB_ENDPOINT http://<product-ec2-ip>:3002

# Deploy Payment Service
./deploy-payment-service.sh <payment-ec2-ip-1> $PAYMENT_DB_ENDPOINT
./deploy-payment-service.sh <payment-ec2-ip-2> $PAYMENT_DB_ENDPOINT

# Deploy Notification Service
./deploy-notification-service.sh <notification-ec2-ip-1> $NOTIFICATION_DB_ENDPOINT
./deploy-notification-service.sh <notification-ec2-ip-2> $NOTIFICATION_DB_ENDPOINT

# Deploy API Gateway
./deploy-api-gateway.sh <gateway-ec2-ip-1> \
  http://<user-ip>:3001 \
  http://<product-ip>:3002 \
  http://<order-ip>:3003 \
  http://<payment-ip>:3004 \
  http://<notification-ip>:3005

# Deploy Frontend
./deploy-frontend.sh <frontend-ec2-ip-1> http://<gateway-ip>:8080
```

### Setup Load Balancer

```bash
# Edit setup-alb.sh to add your instance IDs
nano setup-alb.sh

# Update these variables:
# - VPC_ID
# - SUBNET_1, SUBNET_2
# - ALB_SG_ID
# - All instance IDs

# Run the script
./setup-alb.sh
```

### Verify Deployment

```bash
# Get ALB DNS name
aws elbv2 describe-load-balancers \
  --names ecommerce-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text

# Test endpoints
ALB_DNS="<alb-dns-name>"
curl http://$ALB_DNS/
curl http://$ALB_DNS/api/products
curl http://$ALB_DNS/api/users/health
```

## Common PM2 Commands (on EC2)

```bash
# List all processes
pm2 list

# View logs
pm2 logs user-service
pm2 logs user-service --lines 100

# Monitor resources
pm2 monit

# Restart service
pm2 restart user-service

# Restart all services
pm2 restart all

# Stop service
pm2 stop user-service

# Delete service
pm2 delete user-service

# Save PM2 configuration
pm2 save

# View detailed info
pm2 show user-service
```

## Service Ports

| Service | Port |
|---------|------|
| User Service | 3001 |
| Product Service | 3002 |
| Order Service | 3003 |
| Payment Service | 3004 |
| Notification Service | 3005 |
| API Gateway | 8080 |
| Frontend | 3000 |

## Health Check Endpoints

```bash
# From within EC2
curl http://localhost:3001/health  # User service
curl http://localhost:3002/health  # Product service
curl http://localhost:3003/health  # Order service
curl http://localhost:3004/health  # Payment service
curl http://localhost:3005/health  # Notification service
curl http://localhost:8080/health  # API Gateway
curl http://localhost:3000/        # Frontend
```

## AWS CLI Quick Commands

```bash
# List EC2 instances
aws ec2 describe-instances \
  --filters "Name=tag:Service,Values=user-service" \
  --query 'Reservations[*].Instances[*].[InstanceId,PublicIpAddress,State.Name]' \
  --output table

# Check RDS status
aws rds describe-db-instances \
  --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceStatus,Endpoint.Address]' \
  --output table

# Check target health
aws elbv2 describe-target-health \
  --target-group-arn <target-group-arn> \
  --output table

# Get ALB DNS
aws elbv2 describe-load-balancers \
  --names ecommerce-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text
```

## Troubleshooting

### Service not starting

```bash
# SSH to instance
ssh -i danish-tokyo.pem ubuntu@<ec2-ip>

# Check PM2 status
pm2 list

# View logs
pm2 logs user-service --err

# Check if port is in use
sudo netstat -tlnp | grep :3001

# Restart service
pm2 restart user-service
```

### Database connection error

```bash
# Test connection from EC2
psql -h $USER_DB_ENDPOINT -U postgres -d postgres

# Check environment variables
cd /opt/ecommerce/user-service
cat .env

# Check security group
aws ec2 describe-security-groups --group-ids <rds-sg-id>
```

### ALB health check failing

```bash
# Check target health
aws elbv2 describe-target-health --target-group-arn <tg-arn>

# SSH to unhealthy instance
ssh -i danish-tokyo.pem ubuntu@<ec2-ip>

# Check service is running
pm2 list

# Test health endpoint
curl http://localhost:3001/health

# Check security group allows ALB traffic
```

## Update Procedure

### Update a single service

```bash
# SSH to instance
ssh -i danish-tokyo.pem ubuntu@<ec2-ip>

# Navigate to service directory
cd /opt/ecommerce/user-service

# Pull latest code (if using git)
git pull

# Install dependencies
npm install --production

# Restart service
pm2 restart user-service

# Verify
pm2 logs user-service
```

### Zero-downtime update (with 2+ instances)

```bash
# Deregister instance 1 from target group
aws elbv2 deregister-targets \
  --target-group-arn <tg-arn> \
  --targets Id=<instance-1-id>

# Wait for connections to drain (30 seconds)
sleep 30

# Update instance 1
# ... update code and restart ...

# Register instance 1 back
aws elbv2 register-targets \
  --target-group-arn <tg-arn> \
  --targets Id=<instance-1-id>

# Wait for health check
sleep 30

# Repeat for instance 2
```

## Resource Cleanup

```bash
# Delete ALB
aws elbv2 delete-load-balancer --load-balancer-arn <alb-arn>

# Delete target groups
aws elbv2 delete-target-group --target-group-arn <tg-arn>

# Terminate EC2 instances
aws ec2 terminate-instances --instance-ids <id1> <id2> ...

# Delete RDS instances
aws rds delete-db-instance \
  --db-instance-identifier ecommerce-user-db \
  --skip-final-snapshot

# Delete Redis
aws elasticache delete-cache-cluster \
  --cache-cluster-id ecommerce-redis

# Delete VPC (after all resources are deleted)
aws ec2 delete-vpc --vpc-id <vpc-id>
```

## Cost Estimate (Monthly)

| Resource | Quantity | Instance Type | Cost (approx) |
|----------|----------|---------------|---------------|
| EC2 Instances | 14 | t3.small | ~$245 |
| RDS PostgreSQL | 5 | db.t3.micro | ~$85 |
| ElastiCache Redis | 1 | cache.t3.micro | ~$17 |
| ALB | 1 | - | ~$22 |
| Data Transfer | - | - | ~$20 |
| **Total** | | | **~$389/month** |

*Costs vary by region and usage. Use AWS Pricing Calculator for accurate estimates.*

## Optimization Tips

1. **Use Reserved Instances** - Save up to 72% for 1-year commitment
2. **Auto Scaling** - Scale down during low traffic
3. **Spot Instances** - Use for non-critical services (up to 90% savings)
4. **CloudWatch Alarms** - Monitor costs and set budget alerts
5. **Right-sizing** - Use t3.micro for low-traffic services
6. **RDS Snapshots** - Delete old snapshots regularly
7. **S3 Lifecycle** - Move old logs to Glacier or delete

## Next Steps

1. **SSL/TLS** - Add HTTPS listener with ACM certificate
2. **Domain** - Configure Route 53 with custom domain
3. **CDN** - Add CloudFront for frontend assets
4. **Monitoring** - Enable CloudWatch detailed monitoring
5. **Backups** - Verify automated backups are working
6. **Auto Scaling** - Configure Auto Scaling Groups
7. **CI/CD** - Setup GitHub Actions for automated deployments

---

For detailed information, refer to:
- Full guide: `EC2_MANUAL_DEPLOYMENT_GUIDE.md`
- Deployment scripts: `deployment-scripts/README.md`
