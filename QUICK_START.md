# Quick Start Guide

## Prerequisites
- Docker Desktop installed and running
- At least 4GB RAM available for Docker

## Starting the Application

### Option 1: Using the Batch Script (Windows)
```bash
# Double-click start.bat
# Or run from terminal:
start.bat
```

### Option 2: Using Docker Compose Directly
```bash
docker-compose up --build
```

### Option 3: Background Mode
```bash
docker-compose up -d --build
```

## Wait for Services to Start
The first time will take 5-10 minutes to download images and build. Subsequent starts will be faster.

Watch the logs for messages like:
```
user-service          | User Service running on port 3001
product-service       | Product Service running on port 3002
order-service         | Order Service running on port 3003
payment-service       | Payment Service running on port 3004
notification-service  | Notification Service running on port 3005
api-gateway          | API Gateway running on port 8080
frontend             | webpack compiled successfully
```

## Access the Application

Once you see "webpack compiled successfully", open your browser:

**Frontend:** http://localhost:3000

## Verify Services are Running

### Check All Services Health
```bash
curl http://localhost:8080/health
```

You should see all services showing "healthy" status.

### Check Individual Services
```bash
curl http://localhost:3001/health  # User Service
curl http://localhost:3002/health  # Product Service
curl http://localhost:3003/health  # Order Service
curl http://localhost:3004/health  # Payment Service
curl http://localhost:3005/health  # Notification Service
```

## Initial Setup

### 1. Create a Test Category
```bash
curl -X POST http://localhost:8080/api/categories \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Electronics\", \"slug\": \"electronics\", \"description\": \"Electronic devices\"}"
```

Save the `id` from the response - you'll need it for creating products.

### 2. Create Test Products
```bash
# Replace CATEGORY_ID with the ID from step 1
curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Laptop\", \"description\": \"High-performance laptop\", \"price\": 999.99, \"sku\": \"LAPTOP-001\", \"stock\": 50, \"categoryId\": \"CATEGORY_ID\"}"

curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Smartphone\", \"description\": \"Latest smartphone\", \"price\": 699.99, \"sku\": \"PHONE-001\", \"stock\": 100, \"categoryId\": \"CATEGORY_ID\"}"

curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Headphones\", \"description\": \"Wireless headphones\", \"price\": 199.99, \"sku\": \"HEAD-001\", \"stock\": 75, \"categoryId\": \"CATEGORY_ID\"}"
```

## Using the Frontend

1. **Open http://localhost:3000**
2. **Register an account:**
   - Click "Login" in the navigation
   - Click "Register here"
   - Fill in the form and submit

3. **Browse products:**
   - Go to "Products" page
   - You should see the products you created

4. **Shop:**
   - Click on a product to view details
   - Click "Add to Cart"
   - Go to "Cart" page
   - Fill in shipping address
   - Click "Place Order"

5. **View orders:**
   - Go to "Orders" page
   - See your order with status and details

## Common Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f product-service
docker-compose logs -f api-gateway
docker-compose logs -f frontend

# Last 50 lines
docker-compose logs --tail=50 user-service
```

### Check Running Containers
```bash
docker-compose ps
```

### Restart a Service
```bash
docker-compose restart product-service
```

### Stop Everything
```bash
# Stop services (keeps data)
docker-compose down

# Or use the batch script
stop.bat

# Stop and remove all data (CAUTION: deletes databases)
docker-compose down -v
```

## Troubleshooting

### "Port is already allocated"
Another service is using the port. Stop it:
```bash
# Find what's using the port
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F
```

### Services won't start
```bash
# Clean rebuild
docker-compose down -v
docker-compose up --build --force-recreate
```

### Can't connect to database
The databases take time to initialize. Wait 30-60 seconds after starting.

### Frontend shows errors
- Make sure API Gateway is running: `curl http://localhost:8080/health`
- Check browser console for errors
- Clear browser cache (Ctrl+Shift+R)

## Next Steps

1. **Explore the API:**
   - See `README.md` for all API endpoints
   - Use Postman or curl to test endpoints
   - Check API Gateway health: http://localhost:8080/health

2. **Modify the code:**
   - Edit files in `services/`, `api-gateway/`, or `frontend/`
   - Changes will auto-reload (hot reload enabled)

3. **Add more data:**
   - Create more categories and products
   - Test the full order flow
   - Check notification service logs for emails

4. **Database inspection:**
   ```bash
   # Connect to a database
   docker exec -it product-db psql -U postgres -d product_db

   # List tables
   \dt

   # Query data
   SELECT * FROM products;
   ```

5. **Production deployment:**
   - See `DEPLOYMENT_GUIDE.md` for AWS deployment
   - Configure environment variables
   - Setup monitoring and logging

## API Endpoints Quick Reference

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order details

### Payments
- `POST /api/payments` - Process payment
- `GET /api/payments` - List payments

### Notifications
- `GET /api/notifications` - List notifications
- `POST /api/notifications` - Send notification

## Support

For more detailed information:
- `README.md` - Complete documentation
- `SETUP_GUIDE.md` - Detailed setup instructions
- `ARCHITECTURE.md` - Architecture overview
- `CODE_IMPLEMENTATION_GUIDE.md` - Implementation details

## Stopping the Application

```bash
# Stop services
docker-compose down

# Or use batch file
stop.bat
```

Data is preserved in Docker volumes. To completely remove all data:
```bash
docker-compose down -v
```

---

**You're all set! Visit http://localhost:3000 to start using the application.**
