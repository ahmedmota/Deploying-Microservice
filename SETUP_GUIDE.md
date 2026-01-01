# Complete Setup Guide

## Step-by-Step Setup Instructions

### Option 1: Docker Compose (Recommended)

This is the fastest and easiest way to get everything running.

#### Step 1: Install Prerequisites

1. **Install Docker Desktop**
   - Windows: Download from https://www.docker.com/products/docker-desktop
   - Mac: Download from https://www.docker.com/products/docker-desktop
   - Linux: Follow instructions at https://docs.docker.com/engine/install/

2. **Verify Installation**
   ```bash
   docker --version
   docker-compose --version
   ```

#### Step 2: Start the Application

```bash
# Navigate to project directory
cd D:\microservice

# Start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

#### Step 3: Verify Services

Wait about 30-60 seconds for all services to start, then verify:

```bash
# Check all containers are running
docker-compose ps

# All services should show "Up" status

# Check API Gateway health (includes all services)
curl http://localhost:8080/health
```

#### Step 4: Access the Application

Open your browser and navigate to:
- **Frontend:** http://localhost:3000

You should see the E-Commerce homepage.

#### Step 5: Test the Application

1. **Register a new account**
   - Click "Login" → "Register here"
   - Fill in the form and submit

2. **Create test data**
   - First, create a category using API:
   ```bash
   curl -X POST http://localhost:8080/api/categories \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Electronics",
       "slug": "electronics",
       "description": "Electronic devices"
     }'
   ```

   - Note the category ID from the response

   - Create a product:
   ```bash
   curl -X POST http://localhost:8080/api/products \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Laptop",
       "description": "High-performance laptop",
       "price": 999.99,
       "sku": "LAPTOP-001",
       "stock": 50,
       "categoryId": "PASTE_CATEGORY_ID_HERE"
     }'
   ```

3. **Browse and shop**
   - Go to Products page
   - View product details
   - Add to cart
   - Complete checkout

### Option 2: Manual Setup (Development)

For development and debugging, you may want to run services individually.

#### Step 1: Install Node.js

- Download and install Node.js 18+ from https://nodejs.org/
- Verify: `node --version` and `npm --version`

#### Step 2: Install PostgreSQL

1. Download PostgreSQL 14+ from https://www.postgresql.org/download/
2. Install with default settings
3. Remember the password you set for the `postgres` user

#### Step 3: Install Redis

**Windows:**
- Download from https://github.com/microsoftarchive/redis/releases
- Or use Docker: `docker run -d -p 6379:6379 redis:7-alpine`

**Mac:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

#### Step 4: Create Databases

Open PostgreSQL (pgAdmin or psql) and create databases:

```sql
CREATE DATABASE user_db;
CREATE DATABASE product_db;
CREATE DATABASE order_db;
CREATE DATABASE payment_db;
CREATE DATABASE notification_db;
```

#### Step 5: Setup Environment Variables

For each service, create a `.env` file:

**User Service** (`ecommerce-microservices/services/user-service/.env`):
```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=user_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key-change-this
JWT_REFRESH_SECRET=your-refresh-secret-change-this
CORS_ORIGIN=http://localhost:3000
```

**Product Service** (`ecommerce-microservices/services/product-service/.env`):
```env
NODE_ENV=development
PORT=3002
DB_HOST=localhost
DB_PORT=5432
DB_NAME=product_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1
CORS_ORIGIN=http://localhost:3000
```

**Order Service** (`ecommerce-microservices/services/order-service/.env`):
```env
NODE_ENV=development
PORT=3003
DB_HOST=localhost
DB_PORT=5432
DB_NAME=order_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
PRODUCT_SERVICE_URL=http://localhost:3002
USER_SERVICE_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3000
```

**Payment Service** (`ecommerce-microservices/services/payment-service/.env`):
```env
NODE_ENV=development
PORT=3004
DB_HOST=localhost
DB_PORT=5432
DB_NAME=payment_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
PAYMENT_GATEWAY_API_KEY=test_key_123456
CORS_ORIGIN=http://localhost:3000
```

**Notification Service** (`ecommerce-microservices/services/notification-service/.env`):
```env
NODE_ENV=development
PORT=3005
DB_HOST=localhost
DB_PORT=5432
DB_NAME=notification_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_FROM=noreply@example.com
CORS_ORIGIN=http://localhost:3000
```

**API Gateway** (`ecommerce-microservices/api-gateway/.env`):
```env
NODE_ENV=development
PORT=8080
USER_SERVICE_URL=http://localhost:3001
PRODUCT_SERVICE_URL=http://localhost:3002
ORDER_SERVICE_URL=http://localhost:3003
PAYMENT_SERVICE_URL=http://localhost:3004
NOTIFICATION_SERVICE_URL=http://localhost:3005
CORS_ORIGIN=http://localhost:3000
```

**Frontend** (`frontend/.env`):
```env
REACT_APP_API_GATEWAY_URL=http://localhost:8080
```

#### Step 6: Install Dependencies

```bash
# User Service
cd ecommerce-microservices/services/user-service
npm install

# Product Service
cd ../product-service
npm install

# Order Service
cd ../order-service
npm install

# Payment Service
cd ../payment-service
npm install

# Notification Service
cd ../notification-service
npm install

# API Gateway
cd ../../api-gateway
npm install

# Frontend
cd ../../../frontend
npm install
```

#### Step 7: Start Services

Open 8 terminal windows and run each service:

**Terminal 1 - User Service:**
```bash
cd ecommerce-microservices/services/user-service
npm run dev
```

**Terminal 2 - Product Service:**
```bash
cd ecommerce-microservices/services/product-service
npm run dev
```

**Terminal 3 - Order Service:**
```bash
cd ecommerce-microservices/services/order-service
npm run dev
```

**Terminal 4 - Payment Service:**
```bash
cd ecommerce-microservices/services/payment-service
npm run dev
```

**Terminal 5 - Notification Service:**
```bash
cd ecommerce-microservices/services/notification-service
npm run dev
```

**Terminal 6 - API Gateway:**
```bash
cd ecommerce-microservices/api-gateway
npm run dev
```

**Terminal 7 - Frontend:**
```bash
cd frontend
npm start
```

#### Step 8: Verify Everything is Running

Check that all services started successfully:
- User Service: http://localhost:3001/health
- Product Service: http://localhost:3002/health
- Order Service: http://localhost:3003/health
- Payment Service: http://localhost:3004/health
- Notification Service: http://localhost:3005/health
- API Gateway: http://localhost:8080/health
- Frontend: http://localhost:3000

## Common Issues and Solutions

### Issue: "Port already in use"

**Solution:**
```bash
# Windows - Find and kill process using port
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac - Find and kill process using port
lsof -ti:3001 | xargs kill -9
```

### Issue: "Cannot connect to database"

**Solutions:**
1. Verify PostgreSQL is running
2. Check database credentials in `.env` files
3. Ensure databases are created
4. Try connecting with psql or pgAdmin

### Issue: "Redis connection failed"

**Solutions:**
1. Verify Redis is running: `redis-cli ping` (should return PONG)
2. Check Redis host and port in `.env` files
3. Restart Redis service

### Issue: Docker containers won't start

**Solutions:**
```bash
# Stop all containers
docker-compose down

# Remove all volumes (WARNING: deletes data)
docker-compose down -v

# Rebuild and start fresh
docker-compose up --build --force-recreate
```

### Issue: "Module not found" errors

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install

# Or with Docker
docker-compose down
docker-compose up --build
```

### Issue: Frontend can't connect to backend

**Solutions:**
1. Verify API Gateway is running on port 8080
2. Check CORS_ORIGIN in backend `.env` files matches frontend URL
3. Check REACT_APP_API_GATEWAY_URL in frontend `.env`
4. Clear browser cache and hard refresh (Ctrl+Shift+R)

## Stopping the Application

### Docker Compose:
```bash
# Stop services
docker-compose down

# Stop and remove all data
docker-compose down -v
```

### Manual Setup:
- Press `Ctrl+C` in each terminal window

## Next Steps

1. **Explore the Frontend**
   - Register an account
   - Create products and categories
   - Place test orders

2. **API Testing**
   - Use Postman or curl to test endpoints
   - Import API collection (if available)

3. **Database Inspection**
   - Connect to databases with pgAdmin or DBeaver
   - Explore the schema and data

4. **Code Exploration**
   - Read through service implementations
   - Understand the microservices patterns used
   - Modify and extend functionality

5. **Production Deployment**
   - Follow `DEPLOYMENT_GUIDE.md` for AWS deployment
   - Setup monitoring and logging
   - Configure CI/CD pipelines

## Getting Help

- Check `README.md` for general information
- Review `ARCHITECTURE.md` for architecture details
- See `CODE_IMPLEMENTATION_GUIDE.md` for implementation patterns
- Read `DEPLOYMENT_GUIDE.md` for production deployment

For specific issues, check the logs:
```bash
# Docker
docker-compose logs -f service-name

# Manual setup
Check the terminal output where the service is running
```
