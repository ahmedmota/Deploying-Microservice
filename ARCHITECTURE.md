# E-Commerce Microservices Architecture on AWS

## Architecture Overview

This is a production-grade microservices architecture for an e-commerce platform deployed on AWS EKS with complete DevOps automation.

## Architecture Diagram (High-Level)

```
Internet
   │
   ├─── Route 53 (DNS)
   │
   ├─── CloudFront CDN (Global Edge Locations)
   │         │
   │         ├─── S3 (Static Assets)
   │         └─── WAF (Web Application Firewall)
   │
   └─── Application Load Balancer (ALB)
             │
             ├─── EKS Cluster (Multi-AZ)
             │      │
             │      ├─── User Service
             │      ├─── Product Service
             │      ├─── Order Service
             │      ├─── Payment Service
             │      └─── Notification Service
             │
             ├─── RDS PostgreSQL (Multi-AZ, Read Replicas)
             │      ├─── user-db
             │      ├─── product-db
             │      ├─── order-db
             │      ├─── payment-db
             │      └─── notification-db
             │
             ├─── ElastiCache Redis (Multi-AZ)
             │      ├─── Session Cache
             │      └─── Application Cache
             │
             ├─── SQS Queues
             │      ├─── order-queue
             │      ├─── payment-queue
             │      └─── notification-queue
             │
             └─── ECR (Container Registry)
```

## AWS Services Breakdown

### 1. Networking Layer
- **VPC**: Custom VPC with CIDR 10.0.0.0/16
- **Subnets**:
  - Public Subnets (3 AZs): 10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24
  - Private Subnets (3 AZs): 10.0.11.0/24, 10.0.12.0/24, 10.0.13.0/24
  - Database Subnets (3 AZs): 10.0.21.0/24, 10.0.22.0/24, 10.0.23.0/24
- **Internet Gateway**: For public subnet internet access
- **NAT Gateways**: 3 (one per AZ) for private subnet outbound traffic
- **Route Tables**: Separate for public, private, and database subnets

### 2. Compute Layer - EKS
- **EKS Cluster**: Version 1.28+
- **Node Groups**:
  - Application Node Group: t3.medium (2-10 nodes, Auto Scaling)
  - System Node Group: t3.small (2-4 nodes) for monitoring, logging
- **Auto Scaling**: 
  - Cluster Autoscaler
  - Horizontal Pod Autoscaler (HPA) for each service
- **Load Balancer**: ALB with target groups for each service

### 3. Container Registry
- **ECR Repositories**:
  - user-service
  - product-service
  - order-service
  - payment-service
  - notification-service
- **Image Scanning**: Enabled for vulnerability detection
- **Lifecycle Policies**: Keep last 10 images per service

### 4. Database Layer - RDS PostgreSQL
- **5 Separate RDS Instances** (Database per Service pattern):
  - user-db (db.t3.small)
  - product-db (db.t3.medium)
  - order-db (db.t3.medium)
  - payment-db (db.t3.small)
  - notification-db (db.t3.small)
- **Configuration**:
  - Multi-AZ deployment (automatic failover)
  - Read Replicas (1 per database for read-heavy services)
  - Automated backups (7-day retention)
  - Encryption at rest (KMS)
  - Performance Insights enabled
- **Parameter Groups**: Custom for performance tuning
- **Subnet Group**: Database subnets across 3 AZs

### 5. Caching Layer - ElastiCache Redis
- **Redis Cluster**:
  - cache.t3.micro (3 nodes across 3 AZs)
  - Cluster mode enabled
  - Multi-AZ with automatic failover
  - Encryption in-transit and at-rest
- **Use Cases**:
  - Session management
  - Product catalog caching
  - User data caching
  - Rate limiting

### 6. Message Queue - SQS
- **Queues**:
  - order-processing-queue (Standard)
  - payment-processing-queue (FIFO)
  - notification-queue (Standard)
  - dead-letter-queue (DLQ for failed messages)
- **Configuration**:
  - Visibility timeout: 30s
  - Message retention: 4 days
  - Dead letter queue after 3 failed attempts

### 7. CDN & Edge - CloudFront
- **Distribution**:
  - Origins: ALB, S3 (static assets)
  - Cache behaviors for API vs static content
  - Custom SSL certificate (ACM)
  - Geo-restriction if needed
  - Price class: Use Only US, Canada, Europe
- **S3 Bucket**:
  - Static assets (images, CSS, JS)
  - Versioning enabled
  - Lifecycle policies

### 8. Security - WAF
- **AWS WAF Rules**:
  - Rate limiting (1000 requests per 5 minutes per IP)
  - SQL injection protection
  - XSS protection
  - Geographic blocking (if needed)
  - IP reputation lists
- **Attached to**: CloudFront and ALB

### 9. Secrets Management
- **AWS Secrets Manager**:
  - Database credentials
  - API keys
  - JWT secrets
  - Third-party service credentials
- **Rotation**: Automatic every 30 days

### 10. Monitoring & Logging
- **CloudWatch**:
  - Container Insights for EKS
  - Log Groups for each service
  - Custom metrics
  - Alarms for critical metrics
- **X-Ray**: Distributed tracing across services

### 11. Disaster Recovery (Multi-Region)
- **Primary Region**: ap-southeast-1 (Singapore)
- **DR Region**: ap-northeast-1 (Tokyo)
- **Strategy**: Warm Standby
  - RDS Cross-region read replicas
  - S3 cross-region replication
  - Route 53 health checks with failover routing
  - Regular DR drills

### 12. Backup Strategy
- **RDS**: 
  - Automated daily backups
  - Manual snapshots before major changes
  - Cross-region backup copies
- **EBS**: Snapshots for persistent volumes
- **S3**: Versioning + Cross-region replication

## Microservices Architecture

### Service Communication Patterns

```
User Service (Port 3001)
   ├─── Validates JWT tokens
   └─── Publishes user events to SQS

Product Service (Port 3002)
   ├─── Reads from Redis cache
   ├─── Writes to product-db
   └─── Invalidates cache on updates

Order Service (Port 3003)
   ├─── Calls Product Service (REST)
   ├─── Publishes to order-queue
   └─── Consumes from payment-queue

Payment Service (Port 3004)
   ├─── Consumes from order-queue
   ├─── Publishes to payment-queue
   └─── Idempotent payment processing

Notification Service (Port 3005)
   ├─── Consumes from notification-queue
   └─── Sends emails/SMS
```

### Database Schema per Service

**User Service DB**:
- users (id, email, password_hash, name, created_at)
- user_profiles (user_id, phone, address, etc.)

**Product Service DB**:
- products (id, name, description, price, stock, category_id)
- categories (id, name, parent_id)
- inventory (product_id, quantity, warehouse_id)

**Order Service DB**:
- orders (id, user_id, status, total_amount, created_at)
- order_items (id, order_id, product_id, quantity, price)
- shipping_info (order_id, address, tracking_number)

**Payment Service DB**:
- payments (id, order_id, amount, status, payment_method)
- transactions (id, payment_id, transaction_id, gateway_response)

**Notification Service DB**:
- notifications (id, user_id, type, content, status)
- notification_logs (id, notification_id, sent_at, delivery_status)

## Security Architecture

### Network Security
- Private subnets for EKS nodes and databases
- Security groups with least privilege
- NACLs for additional subnet-level protection
- VPC Flow Logs enabled

### Application Security
- JWT-based authentication
- API rate limiting
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- CORS configuration
- HTTPS only (TLS 1.2+)

### Data Security
- Encryption at rest (RDS, ElastiCache, S3)
- Encryption in transit (TLS)
- Database credentials in Secrets Manager
- IAM roles for service-to-service communication
- No hardcoded credentials

## Auto Scaling Strategy

### EKS Cluster Auto Scaling
- **Cluster Autoscaler**: Scales worker nodes based on pod demands
- **Metrics**: CPU, Memory, Custom metrics

### Application Auto Scaling
- **HPA per service**:
  - Target CPU: 70%
  - Target Memory: 80%
  - Min replicas: 2
  - Max replicas: 10
  
### Database Auto Scaling
- RDS storage auto-scaling (up to 1TB)
- Read replica auto-creation based on CPU

## Cost Optimization

1. **Reserved Instances**: RDS and ElastiCache
2. **Spot Instances**: Non-critical EKS worker nodes
3. **S3 Intelligent Tiering**: For static assets
4. **CloudWatch Log retention**: 7 days for dev, 30 days for prod
5. **Right-sizing**: Regular review of instance types
6. **NAT Gateway optimization**: Single NAT in non-prod environments

## Deployment Strategy

### Blue-Green Deployment
- Zero-downtime deployments
- Traffic shifting via ALB target groups
- Automated rollback on health check failures

### CI/CD Pipeline Flow
```
Code Push → GitHub Actions
   ├─── Build Docker images
   ├─── Push to ECR
   ├─── Run tests
   ├─── Security scan
   ├─── Update Kubernetes manifests
   └─── Deploy to EKS (Rolling update)
```

## Monitoring Metrics

### Application Metrics
- Request rate per service
- Response time (p50, p95, p99)
- Error rate
- Active connections

### Infrastructure Metrics
- CPU/Memory utilization (pods, nodes)
- Database connections
- Cache hit ratio
- Queue depth
- Disk I/O

### Business Metrics
- Orders per minute
- Payment success rate
- User registrations
- Product views

## Disaster Recovery Plan

### RTO/RPO
- **RTO (Recovery Time Objective)**: 1 hour
- **RPO (Recovery Point Objective)**: 5 minutes

### DR Procedures
1. Database failover to read replica
2. Route 53 DNS failover to DR region
3. Restore from latest backup
4. Validate data consistency
5. Update monitoring dashboards

## Compliance & Governance

- **PCI DSS**: For payment processing
- **GDPR**: User data protection
- **CloudTrail**: Audit logging enabled
- **Config**: Resource compliance tracking
- **GuardDuty**: Threat detection

---

## Technology Stack Summary

**Backend**: Node.js (Express.js)
**Database**: PostgreSQL 14+
**Cache**: Redis 7+
**Message Queue**: AWS SQS
**Container Orchestration**: Kubernetes (EKS)
**Container Registry**: AWS ECR
**IaC**: Terraform
**CI/CD**: GitHub Actions
**Monitoring**: CloudWatch, X-Ray
**Security**: WAF, Secrets Manager, KMS

---

This architecture provides:
✅ High availability (Multi-AZ)
✅ Scalability (Auto-scaling at all layers)
✅ Security (Defense in depth)
✅ Disaster recovery (Multi-region)
✅ Cost optimization
✅ Production-grade DevOps practices
