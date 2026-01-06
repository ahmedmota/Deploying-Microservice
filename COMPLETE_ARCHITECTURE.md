# Complete E-Commerce Microservices Architecture

## System Overview

This is a full-stack e-commerce platform with:
- **Backend**: Node.js microservices architecture
- **Frontend Web**: React application
- **Mobile App**: React Native (Expo) application
- **Databases**: PostgreSQL (5 instances) + Redis
- **API Gateway**: Centralized routing and load balancing

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Web Browser  │  │ iOS App      │  │ Android App  │          │
│  │ (React)      │  │ (React       │  │ (React       │          │
│  │ Port 3000    │  │  Native)     │  │  Native)     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                             ▼
          ┌──────────────────────────────────┐
          │     API Gateway (Port 8080)      │
          │  - Routing                       │
          │  - Rate Limiting                 │
          │  - CORS                          │
          └──────────┬───────────────────────┘
                     │
      ┌──────────────┼──────────────┬─────────────┐
      │              │              │             │
      ▼              ▼              ▼             ▼
┌─────────┐    ┌─────────┐    ┌─────────┐   ┌──────────┐
│  User   │    │ Product │    │  Order  │   │ Payment  │
│ Service │    │ Service │    │ Service │   │ Service  │
│ :3001   │    │ :3002   │    │ :3003   │   │ :3004    │
└────┬────┘    └────┬────┘    └────┬────┘   └────┬─────┘
     │              │              │             │
     ▼              ▼              ▼             ▼
┌─────────┐    ┌─────────┐    ┌─────────┐   ┌──────────┐
│ User DB │    │Product  │    │Order DB │   │Payment   │
│ :5432   │    │DB :5433 │    │ :5434   │   │DB :5435  │
└─────────┘    └────┬────┘    └─────────┘   └──────────┘
                    │
                    ▼
               ┌─────────┐
               │ Redis   │
               │ :6379   │
               └─────────┘
```

## Services Architecture

### 1. **User Service** (Port 3001)
- **Database**: PostgreSQL (Port 5432)
- **Cache**: Redis (Port 6379)
- **Features**:
  - User registration & authentication
  - JWT token management
  - Profile management
  - Password reset
  - Account verification

**Endpoints**:
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - User login
- POST `/api/auth/logout` - User logout
- GET `/api/auth/me` - Get current user
- POST `/api/auth/refresh` - Refresh token

### 2. **Product Service** (Port 3002)
- **Database**: PostgreSQL (Port 5433)
- **Cache**: Redis (Port 6379)
- **Features**:
  - Product catalog management
  - Category management
  - Product search
  - Inventory tracking
  - Redis caching for performance

**Endpoints**:
- GET `/api/products` - List all products
- GET `/api/products/:id` - Get product details
- POST `/api/products` - Create product
- PUT `/api/products/:id` - Update product
- DELETE `/api/products/:id` - Delete product
- GET `/api/categories` - List categories
- POST `/api/categories` - Create category

### 3. **Order Service** (Port 3003)
- **Database**: PostgreSQL (Port 5434)
- **Features**:
  - Order creation & management
  - Order status tracking
  - Integration with Product Service
  - Inventory validation
  - Order cancellation

**Endpoints**:
- GET `/api/orders` - List user orders
- GET `/api/orders/:id` - Get order details
- POST `/api/orders` - Create order
- PATCH `/api/orders/:id/status` - Update order status
- POST `/api/orders/:id/cancel` - Cancel order

### 4. **Payment Service** (Port 3004)
- **Database**: PostgreSQL (Port 5435)
- **Features**:
  - Payment processing (Mock gateway)
  - Transaction tracking
  - Refund handling
  - Payment status management
  - Idempotency support

**Endpoints**:
- POST `/api/payments` - Process payment
- GET `/api/payments/:id` - Get payment details
- POST `/api/payments/:id/refund` - Process refund
- GET `/api/payments` - List payments

### 5. **Notification Service** (Port 3005)
- **Database**: PostgreSQL (Port 5436)
- **Features**:
  - Email notifications
  - SMS notifications (planned)
  - Push notifications (planned)
  - Notification templates
  - Delivery tracking

**Endpoints**:
- POST `/api/notifications` - Send notification
- GET `/api/notifications` - List notifications
- GET `/api/notifications/:id` - Get notification details
- GET `/api/notifications/user/:userId` - Get user notifications

## Technology Stack

### Backend Services
- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Cache**: Redis
- **ORM**: Sequelize
- **Authentication**: JWT
- **Validation**: express-validator
- **Logging**: Winston
- **Container**: Docker

### Frontend Web
- **Framework**: React 18
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **State Management**: localStorage + Context API
- **Styling**: CSS

### Mobile App
- **Framework**: React Native (Expo)
- **Navigation**: React Navigation v6
- **HTTP Client**: Axios
- **Storage**: AsyncStorage
- **Secure Storage**: Expo SecureStore

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Databases**: 5× PostgreSQL containers
- **Cache**: Redis container
- **API Gateway**: Express.js proxy
- **Networking**: Docker bridge network

## Data Flow

### User Registration Flow
```
Mobile/Web App → API Gateway → User Service → PostgreSQL
                                    ↓
                            Generate JWT Tokens
                                    ↓
                              Store in Redis
                                    ↓
                        Return tokens to client
```

### Product Browsing Flow
```
Mobile/Web App → API Gateway → Product Service
                                    ↓
                              Check Redis Cache
                                    ↓
                          If not cached: Query DB
                                    ↓
                            Cache result in Redis
                                    ↓
                          Return products to client
```

### Order Placement Flow
```
Mobile/Web App → API Gateway → Order Service
                                    ↓
                        Validate products (Product Service)
                                    ↓
                          Check inventory availability
                                    ↓
                            Create order in DB
                                    ↓
                        Update stock (Product Service)
                                    ↓
                      Process payment (Payment Service)
                                    ↓
                    Send confirmation (Notification Service)
                                    ↓
                          Return order to client
```

## Database Schema

### User Service
- **users**: id, email, password_hash, name, phone, role, status
- **profiles**: id, user_id, first_name, last_name, avatar_url, bio, address

### Product Service
- **products**: id, name, description, price, category_id, sku, stock, image_url
- **categories**: id, name, description, slug, is_active

### Order Service
- **orders**: id, user_id, order_number, status, total_amount, shipping_address
- **order_items**: id, order_id, product_id, quantity, price

### Payment Service
- **payments**: id, order_id, amount, status, payment_method, transaction_id

### Notification Service
- **notifications**: id, user_id, type, title, message, status, sent_at

## Security Features

1. **Authentication**
   - JWT-based authentication
   - Access & Refresh tokens
   - Token blacklisting
   - Password hashing (bcrypt)

2. **Rate Limiting**
   - API Gateway: 100 requests/15 minutes
   - Service-level rate limiting

3. **Data Validation**
   - Input validation with express-validator
   - SQL injection prevention (Sequelize ORM)
   - XSS protection (helmet middleware)

4. **CORS**
   - Configured for frontend origins
   - Credentials support

5. **Docker Security**
   - Non-root users in containers
   - Read-only file systems
   - Health checks
   - Resource limits

## Deployment

### Development
```bash
docker-compose up -d
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Mobile App Development
```bash
cd app
npm start
```

## Monitoring & Health Checks

Each service exposes health check endpoints:
- `GET /health` - Service health status
- `GET /metrics` - Service metrics

API Gateway aggregates all service health:
- `GET /health` - Overall system health

## Scalability Considerations

1. **Horizontal Scaling**: Each microservice can be scaled independently
2. **Database Scaling**: Each service has its own database
3. **Caching**: Redis reduces database load
4. **Load Balancing**: API Gateway can be put behind a load balancer
5. **Stateless Services**: All services are stateless for easy scaling

## Future Enhancements

- [ ] Service mesh (Istio/Linkerd)
- [ ] Message queue (RabbitMQ/Kafka)
- [ ] Centralized logging (ELK Stack)
- [ ] Monitoring (Prometheus + Grafana)
- [ ] CI/CD pipeline
- [ ] Kubernetes deployment
- [ ] GraphQL API
- [ ] WebSocket support for real-time features
- [ ] Admin dashboard
- [ ] Analytics service

## Getting Started

1. **Backend**: See `START_HERE.md`
2. **Frontend Web**: See `frontend/README.md`
3. **Mobile App**: See `app/APP_SETUP_GUIDE.md`

## Documentation

- `START_HERE.md` - Quick start guide
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- `ARCHITECTURE.md` - Detailed architecture
- `API_DOCUMENTATION.md` - API reference
- `SETUP_GUIDE.md` - Setup instructions
- `app/APP_SETUP_GUIDE.md` - Mobile app setup

## Support

For issues or questions, please refer to the documentation or check the logs:
```bash
docker-compose logs [service-name]
```
