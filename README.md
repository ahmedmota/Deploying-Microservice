# E-Commerce Microservices Platform

A production-ready e-commerce platform built with microservices architecture, featuring 5 backend services, API Gateway, and a React frontend.

## Architecture Overview

```
┌─────────────┐
│   Frontend  │ (React on port 3000)
│   (React)   │
└──────┬──────┘
       │
┌──────▼──────────┐
│  API Gateway    │ (Port 8080)
│  (Express)      │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┬──────────┐
    │         │          │          │          │
┌───▼───┐ ┌──▼───┐  ┌───▼───┐  ┌───▼───┐  ┌───▼────┐
│ User  │ │Product│ │ Order │ │Payment│ │Notification│
│Service│ │Service│ │Service│ │Service│ │ Service │
│:3001  │ │ :3002 │ │ :3003 │ │ :3004 │ │  :3005  │
└───┬───┘ └───┬──┘  └───┬───┘  └───┬───┘  └────┬───┘
    │         │          │          │           │
┌───▼───┐ ┌───▼──┐   ┌──▼───┐  ┌───▼───┐  ┌───▼────┐
│User DB│ │Product│  │Order │  │Payment│  │Notif DB│
│:5432  │ │DB     │  │DB    │  │DB     │  │ :5436  │
└───────┘ │:5433  │  │:5434 │  │:5435  │  └────────┘
          └───┬───┘  └──────┘  └───────┘
              │
          ┌───▼────┐
          │ Redis  │
          │ :6379  │
          └────────┘
```

## Services

### 1. User Service (Port 3001)
- User registration and authentication
- JWT token management (access + refresh tokens)
- Profile management
- Account lockout on failed attempts
- Role-based access control

**Endpoints:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user
- `GET /api/users` - List users (admin)
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/password` - Change password

### 2. Product Service (Port 3002)
- Product catalog management
- Category management
- Redis caching for performance
- Stock management
- Search and filtering

**Endpoints:**
- `GET /api/products` - List products (with pagination, search, category filter)
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `PATCH /api/products/:id/stock` - Update stock
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category

### 3. Order Service (Port 3003)
- Order creation and management
- Integration with Product Service for inventory
- Order status tracking
- Order cancellation with stock restoration

**Endpoints:**
- `POST /api/orders` - Create order
- `GET /api/orders` - List orders (with filters)
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id/status` - Update order status
- `POST /api/orders/:id/cancel` - Cancel order

### 4. Payment Service (Port 3004)
- Payment processing (mock gateway)
- Idempotency support
- Refund handling
- Payment status tracking

**Endpoints:**
- `POST /api/payments` - Process payment
- `GET /api/payments` - List payments
- `GET /api/payments/:id` - Get payment details
- `GET /api/payments/order/:orderId` - Get payments by order
- `POST /api/payments/:id/refund` - Refund payment

### 5. Notification Service (Port 3005)
- Email notifications (SMTP/AWS SES)
- SMS notifications (mock)
- Push notifications (mock)
- Notification templates
- Notification history

**Endpoints:**
- `POST /api/notifications` - Send notification
- `GET /api/notifications` - List notifications
- `GET /api/notifications/:id` - Get notification details
- `GET /api/notifications/user/:userId` - Get user notifications

### 6. API Gateway (Port 8080)
- Single entry point for all services
- Request routing and proxying
- Rate limiting
- CORS handling
- Health check aggregation

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend Runtime | Node.js | 18+ |
| Backend Framework | Express.js | 4.18+ |
| Database | PostgreSQL | 14+ |
| Cache | Redis | 7+ |
| Frontend | React | 18+ |
| Frontend Router | React Router | 6+ |
| HTTP Client | Axios | 1.6+ |
| Container | Docker & Docker Compose | Latest |
| ORM | Sequelize | 6.35+ |

## Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Git

## Quick Start

### 1. Clone the Repository

```bash
cd D:\microservice
```

### 2. Start All Services with Docker Compose

```bash
# Start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

This will start:
- 5 PostgreSQL databases (ports 5432-5436)
- Redis (port 6379)
- 5 microservices (ports 3001-3005)
- API Gateway (port 8080)
- Frontend (port 3000)

### 3. Access the Application

- **Frontend:** http://localhost:3000
- **API Gateway:** http://localhost:8080
- **API Gateway Health Check:** http://localhost:8080/health

### 4. Verify Services are Running

```bash
# Check all containers
docker-compose ps

# Check logs
docker-compose logs -f

# Check specific service logs
docker-compose logs -f user-service
docker-compose logs -f product-service
```

## Manual Setup (Without Docker)

### 1. Install Dependencies

```bash
# Install dependencies for each service
cd ecommerce-microservices/services/user-service && npm install
cd ../product-service && npm install
cd ../order-service && npm install
cd ../payment-service && npm install
cd ../notification-service && npm install
cd ../../api-gateway && npm install
cd ../../frontend && npm install
```

### 2. Setup Databases

Create 5 PostgreSQL databases:
```sql
CREATE DATABASE user_db;
CREATE DATABASE product_db;
CREATE DATABASE order_db;
CREATE DATABASE payment_db;
CREATE DATABASE notification_db;
```

### 3. Setup Environment Variables

Copy `.env.example` to `.env` in each service directory and update:

```bash
# In each service directory
cp .env.example .env
```

Update the database connection details and other configurations.

### 4. Start Services

```bash
# Terminal 1 - Redis
redis-server

# Terminal 2 - User Service
cd ecommerce-microservices/services/user-service
npm run dev

# Terminal 3 - Product Service
cd ecommerce-microservices/services/product-service
npm run dev

# Terminal 4 - Order Service
cd ecommerce-microservices/services/order-service
npm run dev

# Terminal 5 - Payment Service
cd ecommerce-microservices/services/payment-service
npm run dev

# Terminal 6 - Notification Service
cd ecommerce-microservices/services/notification-service
npm run dev

# Terminal 7 - API Gateway
cd ecommerce-microservices/api-gateway
npm run dev

# Terminal 8 - Frontend
cd frontend
npm start
```

## Testing the Application

### 1. Register a New User

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "profile": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 3. Create a Category

```bash
curl -X POST http://localhost:8080/api/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Electronics",
    "slug": "electronics",
    "description": "Electronic devices and gadgets"
  }'
```

### 4. Create a Product

```bash
curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "description": "High-performance laptop",
    "price": 999.99,
    "sku": "LAPTOP-001",
    "stock": 50,
    "categoryId": "CATEGORY_ID_FROM_STEP_3"
  }'
```

### 5. Get All Products

```bash
curl http://localhost:8080/api/products
```

### 6. Create an Order

```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "USER_ID",
    "items": [
      {
        "productId": "PRODUCT_ID",
        "quantity": 2
      }
    ],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "country": "USA",
      "postalCode": "10001"
    }
  }'
```

## Frontend Features

The React frontend includes:

- **Home Page** - Overview of the microservices architecture
- **Products Page** - Browse products with search and category filters
- **Product Detail Page** - View product details and add to cart
- **Shopping Cart** - Manage cart items and checkout
- **Orders Page** - View order history and status
- **Login/Register** - User authentication

### Using the Frontend

1. Open http://localhost:3000
2. Register a new account or login
3. Browse products and add to cart
4. Proceed to checkout and place order
5. View orders in the Orders page

## Database Schema

### User Service
- `users` - User accounts with authentication
- `profiles` - User profile information

### Product Service
- `categories` - Product categories
- `products` - Product catalog with inventory

### Order Service
- `orders` - Order headers
- `order_items` - Order line items

### Payment Service
- `payments` - Payment transactions

### Notification Service
- `notifications` - Notification logs

## Key Features

### Security
- JWT-based authentication
- Password hashing with bcrypt
- Account lockout mechanism
- Rate limiting
- CORS protection
- Helmet security headers

### Performance
- Redis caching for products
- Database connection pooling
- Compression middleware
- Efficient database indexing

### Reliability
- Health check endpoints
- Graceful shutdown
- Database transaction support
- Error handling and logging

### Scalability
- Microservices architecture
- Stateless services
- Database per service pattern
- Horizontal scaling ready

## Development

### Project Structure

```
D:\microservice\
├── ecommerce-microservices/
│   ├── services/
│   │   ├── user-service/
│   │   ├── product-service/
│   │   ├── order-service/
│   │   ├── payment-service/
│   │   └── notification-service/
│   └── api-gateway/
├── frontend/
├── docker-compose.yml
└── README.md
```

### Adding a New Service

1. Create service directory in `ecommerce-microservices/services/`
2. Initialize with `package.json`, `Dockerfile`, `.env.example`
3. Implement using the existing service pattern
4. Add database configuration to `docker-compose.yml`
5. Add route to API Gateway

### Running Tests

```bash
# In each service directory
npm test
```

## Monitoring and Debugging

### Check Service Health

```bash
# API Gateway aggregated health
curl http://localhost:8080/health

# Individual service health
curl http://localhost:3001/health  # User Service
curl http://localhost:3002/health  # Product Service
curl http://localhost:3003/health  # Order Service
curl http://localhost:3004/health  # Payment Service
curl http://localhost:3005/health  # Notification Service
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f product-service

# Last 100 lines
docker-compose logs --tail=100 order-service
```

### Database Access

```bash
# Connect to User DB
docker exec -it user-db psql -U postgres -d user_db

# Connect to Product DB
docker exec -it product-db psql -U postgres -d product_db
```

## Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (deletes all data)
docker-compose down -v
```

## Production Deployment

For production deployment:

1. Use production Dockerfile stage (multi-stage build)
2. Configure environment variables properly
3. Use managed databases (AWS RDS, Azure Database, etc.)
4. Use managed Redis (ElastiCache, Azure Cache, etc.)
5. Deploy to Kubernetes (EKS, AKS, GKE)
6. Configure proper monitoring (CloudWatch, Datadog, etc.)
7. Setup CI/CD pipelines
8. Enable HTTPS/TLS
9. Configure proper logging and tracing

Refer to the existing `DEPLOYMENT_GUIDE.md` for detailed AWS EKS deployment instructions.

## Troubleshooting

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### Database Connection Issues

- Verify PostgreSQL is running: `docker-compose ps`
- Check database credentials in `.env` files
- Ensure database is created
- Check network connectivity

### Redis Connection Issues

- Verify Redis is running: `docker-compose ps redis`
- Check Redis host and port in `.env` files
- Test connection: `docker exec -it redis redis-cli ping`

### Service Not Starting

- Check logs: `docker-compose logs service-name`
- Verify dependencies are installed: `npm install`
- Check port availability
- Verify environment variables

## License

This project is for educational purposes.

## Contributing

This is a demonstration project for microservices architecture. Feel free to fork and modify for your needs.

## Support

For issues and questions, please refer to the documentation files:
- `ARCHITECTURE.md` - Architecture overview
- `CODE_IMPLEMENTATION_GUIDE.md` - Implementation details
- `DEPLOYMENT_GUIDE.md` - AWS deployment guide
- `QUICK_START_GUIDE.md` - Learning pathway
