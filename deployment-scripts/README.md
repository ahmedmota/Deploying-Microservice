# Deployment Scripts

This directory contains scripts for deploying the e-commerce microservices platform to AWS EC2 instances without Docker.

## Quick Start

### 1. Prerequisites

- AWS CLI configured with appropriate credentials
- SSH key pair (.pem file) - referenced as `danish-tokyo.pem` in parent directory
- Bash shell (Linux, macOS, WSL on Windows, or Git Bash)

### 2. Infrastructure Setup (One-time)

Run these scripts in order:

```bash
# Make scripts executable
chmod +x *.sh

# 1. Create VPC, subnets, security groups
./setup-infrastructure.sh

# 2. Create RDS PostgreSQL databases (takes 10-15 minutes)
./create-databases.sh

# 3. Create ElastiCache Redis (takes 5-10 minutes)
./create-redis.sh

# 4. Wait for resources to be ready, then get endpoints
./get-db-endpoints.sh
```

This will create:
- VPC with public and private subnets across 2 availability zones
- Security groups for ALB, EC2, RDS, and Redis
- 5 RDS PostgreSQL instances (one per service)
- 1 ElastiCache Redis cluster
- Configuration files with resource IDs

### 3. Launch EC2 Instances

Launch EC2 instances manually or using AWS CLI:

```bash
# Example: Launch an instance for user-service
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --count 2 \
  --instance-type t3.small \
  --key-name your-key-pair \
  --security-group-ids <EC2_SG_ID from infrastructure-config.txt> \
  --subnet-id <PUBLIC_SUBNET_1 from infrastructure-config.txt> \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=user-service-1},{Key=Service,Value=user-service}]' \
  --user-data file://setup-instance.sh
```

**Required Instances:**
- User Service: 2 instances
- Product Service: 2 instances
- Order Service: 2 instances
- Payment Service: 2 instances
- Notification Service: 2 instances
- API Gateway: 2 instances
- Frontend: 2 instances

**Total: 14 EC2 instances** (for high availability)

### 4. Setup EC2 Instances

SSH into each instance and run the setup script:

```bash
# Copy setup script to instance
scp -i ../danish-tokyo.pem setup-instance.sh ubuntu@<ec2-ip>:/home/ubuntu/

# SSH and run setup
ssh -i ../danish-tokyo.pem ubuntu@<ec2-ip>
sudo bash setup-instance.sh
```

### 5. Deploy Services

Use the deployment scripts to deploy each service:

```bash
# User Service (run from your local machine)
./deploy-user-service.sh <ec2-ip> <user-db-endpoint> <redis-endpoint>

# Product Service
./deploy-product-service.sh <ec2-ip> <product-db-endpoint> <redis-endpoint>

# Order Service
./deploy-order-service.sh <ec2-ip> <order-db-endpoint> <product-service-url>

# Payment Service
./deploy-payment-service.sh <ec2-ip> <payment-db-endpoint>

# Notification Service
./deploy-notification-service.sh <ec2-ip> <notification-db-endpoint>

# API Gateway (needs URLs of all services)
./deploy-api-gateway.sh <ec2-ip> <user-url> <product-url> <order-url> <payment-url> <notification-url>

# Frontend (needs API Gateway URL)
./deploy-frontend.sh <ec2-ip> <api-gateway-url>
```

### 6. Setup Application Load Balancer

Update `setup-alb.sh` with your instance IDs, then run:

```bash
# Edit the script first to add your instance IDs
nano setup-alb.sh

# Run the script
./setup-alb.sh
```

This creates:
- Application Load Balancer
- Target groups for each service
- Listener rules for path-based routing
- Registers EC2 instances with target groups

## Scripts Overview

### Infrastructure Scripts

| Script | Purpose |
|--------|---------|
| `setup-infrastructure.sh` | Creates VPC, subnets, security groups, subnet groups |
| `create-databases.sh` | Creates 5 RDS PostgreSQL instances |
| `create-redis.sh` | Creates ElastiCache Redis cluster |
| `get-db-endpoints.sh` | Retrieves database and cache endpoints |

### Instance Setup Scripts

| Script | Purpose |
|--------|---------|
| `setup-instance.sh` | Installs Node.js, PM2, and dependencies on EC2 |
| `ecosystem.config.js` | PM2 configuration for all services |

### Deployment Scripts

| Script | Purpose |
|--------|---------|
| `deploy-user-service.sh` | Deploys user service to EC2 |
| `deploy-product-service.sh` | Deploys product service to EC2 |
| `deploy-order-service.sh` | Deploys order service to EC2 |
| `deploy-payment-service.sh` | Deploys payment service to EC2 |
| `deploy-notification-service.sh` | Deploys notification service to EC2 |
| `deploy-api-gateway.sh` | Deploys API gateway to EC2 |
| `deploy-frontend.sh` | Deploys React frontend to EC2 |

### Load Balancer Scripts

| Script | Purpose |
|--------|---------|
| `setup-alb.sh` | Creates ALB, target groups, and listener rules |

## Architecture

```
                    Internet
                       |
          [Application Load Balancer]
                       |
    +------------------+------------------+
    |                  |                  |
[User Service]  [Product Service]  [Order Service]
   (2 EC2)         (2 EC2)            (2 EC2)
       |               |                  |
   [User DB]      [Product DB]      [Order DB]
       |               |                  |
       +-------[Redis Cache]-------+------+
```

## Configuration Files

After running setup scripts, you'll have these configuration files:

- `infrastructure-config.txt` - VPC, subnet, and security group IDs
- `database-endpoints.txt` - Database and Redis endpoints

## Monitoring

### PM2 Commands (on EC2 instances)

```bash
pm2 list                    # List all running processes
pm2 logs <service-name>     # View logs for a service
pm2 monit                   # Monitor resource usage
pm2 restart <service-name>  # Restart a service
pm2 stop <service-name>     # Stop a service
pm2 delete <service-name>   # Remove a service
```

### Health Checks

All services expose `/health` endpoints that the ALB uses for health checks:

```bash
# Check service health
curl http://<ec2-ip>:3001/health  # User service
curl http://<ec2-ip>:3002/health  # Product service
# etc.
```

### ALB Health

```bash
# Check target health
aws elbv2 describe-target-health --target-group-arn <target-group-arn>
```

## Updates and Redeployment

To update a service:

1. SSH into the instance
2. Pull latest code or copy new files
3. Restart with PM2:

```bash
cd /opt/ecommerce/<service-name>
git pull  # or copy new files
npm install --production
pm2 restart <service-name>
```

Or use the deployment script again:

```bash
./deploy-user-service.sh <ec2-ip> <db-host> <redis-host>
```

## Troubleshooting

### Service not starting

```bash
# Check PM2 logs
pm2 logs <service-name>

# Check if port is in use
sudo netstat -tlnp | grep :3001

# Restart service
pm2 restart <service-name>
```

### Database connection issues

```bash
# Test database connection
psql -h <db-endpoint> -U postgres -d userdb

# Check security group allows connection
aws ec2 describe-security-groups --group-ids <rds-sg-id>
```

### Health check failing

```bash
# Test health endpoint locally
curl http://localhost:3001/health

# Check if service is running
pm2 list

# View detailed logs
pm2 logs <service-name> --lines 100
```

### ALB not routing traffic

```bash
# Check target health
aws elbv2 describe-target-health --target-group-arn <tg-arn>

# Check listener rules
aws elbv2 describe-rules --listener-arn <listener-arn>

# Check security groups allow traffic from ALB
```

## Security Best Practices

1. **Change default passwords** in database creation scripts
2. **Restrict SSH access** in security groups to your IP only
3. **Use AWS Secrets Manager** for storing credentials
4. **Enable HTTPS** by setting up SSL certificates
5. **Regular updates** - keep Node.js and dependencies updated
6. **Enable CloudWatch logs** for monitoring
7. **Use IAM roles** instead of access keys where possible

## Cost Optimization

- Use **t3.small** instances (or smaller) for low-traffic services
- Enable **auto-scaling** to handle traffic variations
- Use **Reserved Instances** for predictable workloads
- Delete unused resources
- Enable **RDS automated backups** but set retention appropriately
- Use **ElastiCache** judiciously

## Next Steps

1. Set up SSL/TLS certificates for HTTPS
2. Configure Route 53 for custom domain
3. Enable CloudWatch monitoring and alarms
4. Set up CI/CD pipeline (GitHub Actions, CodePipeline)
5. Implement auto-scaling groups
6. Add CloudFront CDN for frontend
7. Set up disaster recovery in another region

## Support

For issues or questions, refer to:
- Main deployment guide: `../EC2_MANUAL_DEPLOYMENT_GUIDE.md`
- AWS documentation: https://docs.aws.amazon.com/
- PM2 documentation: https://pm2.keymetrics.io/
