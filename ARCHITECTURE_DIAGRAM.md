# EC2 Deployment Architecture Diagram

## High-Level Architecture

```
                                    Internet
                                       |
                                       |
                        [Route 53 DNS (Optional)]
                                       |
                                       |
                        +---------------------------+
                        | Application Load Balancer |
                        |   (ecommerce-alb)         |
                        +---------------------------+
                                       |
          +----------------------------+---------------------------+
          |                            |                           |
    Path: /api/users/*          Path: /api/products/*       Path: / (default)
          |                            |                           |
          v                            v                           v
    +-----------+              +--------------+             +-----------+
    | User TG   |              | Product TG   |             |Frontend TG|
    +-----------+              +--------------+             +-----------+
          |                            |                           |
    +-----+-----+              +-------+-------+           +-------+-------+
    |           |              |               |           |               |
 [User-1]   [User-2]      [Product-1]    [Product-2]   [Front-1]     [Front-2]
 EC2:3001   EC2:3001      EC2:3002       EC2:3002      EC2:3000      EC2:3000
    |           |              |               |
    +-----------+--------------+---------------+
                |
                v
         [Redis Cache]
         ElastiCache
                |
                v
    +-----------+--------------+---------------+
    |           |              |               |
 [User DB]  [Product DB]   [Order DB]    [Payment DB]
   RDS        RDS            RDS            RDS
```

## Detailed Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AWS Cloud (ap-southeast-1)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      VPC (10.0.0.0/16)                           │   │
│  │                                                                   │   │
│  │  ┌────────────────────────────────────────────────────────┐     │   │
│  │  │         Public Subnet 1 (10.0.1.0/24 - AZ-1a)          │     │   │
│  │  │                                                          │     │   │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐       │     │   │
│  │  │  │ User-1     │  │ Product-1  │  │ Order-1    │       │     │   │
│  │  │  │ t3.small   │  │ t3.small   │  │ t3.small   │       │     │   │
│  │  │  │ :3001      │  │ :3002      │  │ :3003      │       │     │   │
│  │  │  └────────────┘  └────────────┘  └────────────┘       │     │   │
│  │  │                                                          │     │   │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐       │     │   │
│  │  │  │ Payment-1  │  │ Notif-1    │  │ Gateway-1  │       │     │   │
│  │  │  │ t3.small   │  │ t3.small   │  │ t3.small   │       │     │   │
│  │  │  │ :3004      │  │ :3005      │  │ :8080      │       │     │   │
│  │  │  └────────────┘  └────────────┘  └────────────┘       │     │   │
│  │  │                                                          │     │   │
│  │  │  ┌────────────┐                                         │     │   │
│  │  │  │ Frontend-1 │                                         │     │   │
│  │  │  │ t3.small   │                                         │     │   │
│  │  │  │ :3000      │                                         │     │   │
│  │  │  └────────────┘                                         │     │   │
│  │  └────────────────────────────────────────────────────────┘     │   │
│  │                                                                   │   │
│  │  ┌────────────────────────────────────────────────────────┐     │   │
│  │  │         Public Subnet 2 (10.0.2.0/24 - AZ-1b)          │     │   │
│  │  │                                                          │     │   │
│  │  │  [Same services as Subnet 1 - instances 2 of each]     │     │   │
│  │  │  User-2, Product-2, Order-2, Payment-2, etc.           │     │   │
│  │  │                                                          │     │   │
│  │  └────────────────────────────────────────────────────────┘     │   │
│  │                                                                   │   │
│  │  ┌────────────────────────────────────────────────────────┐     │   │
│  │  │        Private Subnet 1 (10.0.11.0/24 - AZ-1a)         │     │   │
│  │  │                                                          │     │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │     │   │
│  │  │  │ User-DB  │  │Product-DB│  │ Order-DB │             │     │   │
│  │  │  │db.t3.micro  │db.t3.micro  │db.t3.micro             │     │   │
│  │  │  └──────────┘  └──────────┘  └──────────┘             │     │   │
│  │  │                                                          │     │   │
│  │  │  ┌──────────┐  ┌──────────┐                            │     │   │
│  │  │  │Payment-DB│  │Notif-DB  │                            │     │   │
│  │  │  │db.t3.micro  │db.t3.micro                            │     │   │
│  │  │  └──────────┘  └──────────┘                            │     │   │
│  │  │                                                          │     │   │
│  │  │  ┌─────────────────┐                                    │     │   │
│  │  │  │  Redis Cache    │                                    │     │   │
│  │  │  │ cache.t3.micro  │                                    │     │   │
│  │  │  └─────────────────┘                                    │     │   │
│  │  └────────────────────────────────────────────────────────┘     │   │
│  │                                                                   │   │
│  │  ┌────────────────────────────────────────────────────────┐     │   │
│  │  │        Private Subnet 2 (10.0.12.0/24 - AZ-1b)         │     │   │
│  │  │                                                          │     │   │
│  │  │  [Multi-AZ replicas of databases]                       │     │   │
│  │  │                                                          │     │   │
│  │  └────────────────────────────────────────────────────────┘     │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Request Flow

```
User Browser
     |
     | 1. HTTP Request
     v
Application Load Balancer (Port 80/443)
     |
     | 2. Path-based routing
     +-------------------------------------------+
     |                    |                      |
     v                    v                      v
Frontend TG         User Service TG      Product Service TG
(Port 3000)         (Port 3001)          (Port 3002)
     |                    |                      |
     v                    v                      v
Frontend EC2        User Service EC2    Product Service EC2
     |                    |                      |
     |                    +----------+-----------+
     |                               |
     |                               v
     |                         Redis Cache
     |                               |
     |                               v
     |                        PostgreSQL RDS
     |                               |
     v                               v
3. Response <----------------------+
     |
     v
User Browser
```

## Security Groups

```
┌─────────────────────────────────────────────────────────────┐
│                      Security Groups                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   ALB-SG     │    │   EC2-SG     │    │   RDS-SG     │  │
│  ├──────────────┤    ├──────────────┤    ├──────────────┤  │
│  │ Inbound:     │    │ Inbound:     │    │ Inbound:     │  │
│  │ • 80  (0/0)  │───▶│ • 22  (You)  │    │ • 5432       │  │
│  │ • 443 (0/0)  │    │ • 3001 (ALB) │───▶│   (EC2-SG)   │  │
│  │              │    │ • 3002 (ALB) │    │              │  │
│  │ Outbound:    │    │ • 3003 (ALB) │    │ Outbound:    │  │
│  │ • All        │    │ • 3004 (ALB) │    │ • All        │  │
│  └──────────────┘    │ • 3005 (ALB) │    └──────────────┘  │
│                      │ • 8080 (ALB) │                       │
│  ┌──────────────┐    │ • 3000 (ALB) │                       │
│  │  Redis-SG    │    │              │                       │
│  ├──────────────┤    │ Outbound:    │                       │
│  │ Inbound:     │    │ • All        │                       │
│  │ • 6379       │◀───┤              │                       │
│  │   (EC2-SG)   │    └──────────────┘                       │
│  │              │                                            │
│  │ Outbound:    │                                            │
│  │ • All        │                                            │
│  └──────────────┘                                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## ALB Routing Rules

```
┌─────────────────────────────────────────────────────────────┐
│          Application Load Balancer - Listener Rules         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Priority 1:  /api/users/*        ──▶  User Service TG      │
│  Priority 2:  /api/auth/*         ──▶  User Service TG      │
│  Priority 3:  /api/products/*     ──▶  Product Service TG   │
│  Priority 4:  /api/categories/*   ──▶  Product Service TG   │
│  Priority 5:  /api/orders/*       ──▶  Order Service TG     │
│  Priority 6:  /api/payments/*     ──▶  Payment Service TG   │
│  Priority 7:  /api/notifications/*──▶  Notification TG      │
│  Priority 8:  /api/*              ──▶  API Gateway TG       │
│  Default:     /*                  ──▶  Frontend TG          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Target Groups and Health Checks

```
┌─────────────────────────────────────────────────────────────────┐
│                         Target Groups                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ User Service TG                                         │     │
│  │ - Port: 3001                                            │     │
│  │ - Protocol: HTTP                                        │     │
│  │ - Health Check: /health                                 │     │
│  │ - Interval: 30s                                         │     │
│  │ - Timeout: 5s                                           │     │
│  │ - Healthy Threshold: 2                                  │     │
│  │ - Unhealthy Threshold: 3                                │     │
│  │ - Targets: user-service-1, user-service-2               │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                   │
│  [Similar configuration for other target groups]                 │
│  - Product Service TG (Port 3002)                                │
│  - Order Service TG (Port 3003)                                  │
│  - Payment Service TG (Port 3004)                                │
│  - Notification Service TG (Port 3005)                           │
│  - API Gateway TG (Port 8080)                                    │
│  - Frontend TG (Port 3000, Health: /)                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## PM2 Process Management

```
┌─────────────────────────────────────────────────────────────┐
│             PM2 Process Manager (on each EC2)                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Service Instance                                    │    │
│  │  ├── PM2 Cluster Mode (2 worker processes)          │    │
│  │  │   ├── Worker 1 (PID: 1234)                       │    │
│  │  │   └── Worker 2 (PID: 1235)                       │    │
│  │  │                                                    │    │
│  │  ├── Auto-restart on crash                          │    │
│  │  ├── Max memory: 300MB (auto-restart)               │    │
│  │  ├── Logs: /var/log/ecommerce/service.log           │    │
│  │  └── Error logs: /var/log/ecommerce/service-err.log │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow - User Registration Example

```
1. User submits registration form
        ↓
2. Browser → ALB (http://alb-dns.com/api/auth/register)
        ↓
3. ALB routes to User Service TG (rule: /api/auth/*)
        ↓
4. User Service EC2 receives request (port 3001)
        ↓
5. User Service validates data
        ↓
6. User Service checks Redis cache for existing email
        ↓
7. User Service writes to PostgreSQL (User DB)
        ↓
8. User Service returns JWT token
        ↓
9. Response → ALB → Browser
        ↓
10. User is redirected to dashboard
```

## Scaling Considerations

```
Horizontal Scaling:
┌─────────────────────────────────────────────────────────────┐
│  Current: 2 instances per service (14 total EC2)             │
│                                                               │
│  Scale up by:                                                 │
│  1. Launch new EC2 instance                                  │
│  2. Run setup and deployment scripts                         │
│  3. Register instance with target group                      │
│  4. ALB automatically distributes traffic                    │
│                                                               │
│  Can scale to:                                                │
│  - User Service: 2-10 instances                              │
│  - Product Service: 2-8 instances                            │
│  - Order Service: 2-8 instances                              │
│  - Payment Service: 2-6 instances                            │
│  - Notification Service: 2-4 instances                       │
│  - API Gateway: 2-6 instances                                │
│  - Frontend: 2-6 instances                                   │
└─────────────────────────────────────────────────────────────┘

Vertical Scaling:
┌─────────────────────────────────────────────────────────────┐
│  Current: t3.small (2 vCPU, 2GB RAM)                         │
│                                                               │
│  Can upgrade to:                                              │
│  - t3.medium (2 vCPU, 4GB RAM)                               │
│  - t3.large (2 vCPU, 8GB RAM)                                │
│  - t3.xlarge (4 vCPU, 16GB RAM)                              │
│                                                               │
│  Database scaling:                                            │
│  - db.t3.micro → db.t3.small → db.t3.medium                  │
│  - Add read replicas for read-heavy workloads                │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Zones

```
┌─────────────────────────────────────────────────────────────┐
│               Availability Zone Distribution                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ap-southeast-1a              ap-southeast-1b                │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │ User Service 1   │         │ User Service 2   │          │
│  │ Product Service 1│         │ Product Service 2│          │
│  │ Order Service 1  │         │ Order Service 1  │          │
│  │ Payment Service 1│         │ Payment Service 2│          │
│  │ Notif Service 1  │         │ Notif Service 2  │          │
│  │ API Gateway 1    │         │ API Gateway 2    │          │
│  │ Frontend 1       │         │ Frontend 2       │          │
│  │                  │         │                  │          │
│  │ RDS Primary      │         │ RDS Standby      │          │
│  │ Redis Primary    │         │                  │          │
│  └──────────────────┘         └──────────────────┘          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

This architecture provides high availability, fault tolerance, and the ability to scale based on demand.
