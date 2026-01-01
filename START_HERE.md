# START HERE - E-Commerce Microservices

## Quick Start (2 Steps)

### Step 1: Start All Services
```bash
docker-compose -f docker-compose.prod.yml up --build
```

Or double-click: `start-prod.bat`

### Step 2: Wait & Access
Wait 3-5 minutes for build to complete. Look for:
```
frontend | webpack compiled successfully
```

Then open: **http://localhost:3000**

---

## What's Included

✅ **5 Backend Microservices** (Ports 3001-3005)
- User Service - Authentication & profiles
- Product Service - Product catalog with Redis caching
- Order Service - Order processing
- Payment Service - Payment processing
- Notification Service - Email notifications

✅ **API Gateway** (Port 8080)
- Single entry point for all services
- Request routing & load balancing

✅ **React Frontend** (Port 3000)
- Browse products
- Shopping cart
- Order placement
- User authentication

✅ **Infrastructure**
- 5 PostgreSQL databases (one per service)
- Redis cache
- Docker containerization

---

## First Time Setup

### 1. Create Test Data

**Create a category:**
```bash
curl -X POST http://localhost:8080/api/categories \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Electronics\", \"slug\": \"electronics\", \"description\": \"Electronic devices\"}"
```

Copy the `id` from the response.

**Create products** (replace `CATEGORY_ID`):
```bash
curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Laptop\", \"description\": \"Gaming laptop\", \"price\": 999.99, \"sku\": \"LAP-001\", \"stock\": 50, \"categoryId\": \"CATEGORY_ID\"}"

curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Smartphone\", \"description\": \"Latest model\", \"price\": 699.99, \"sku\": \"PHO-001\", \"stock\": 100, \"categoryId\": \"CATEGORY_ID\"}"
```

### 2. Use the Frontend

1. Open http://localhost:3000
2. Click **Login** → **Register here**
3. Create your account
4. Go to **Products** page
5. Click on a product → **Add to Cart**
6. Go to **Cart** → Fill shipping address → **Place Order**
7. View your order in **Orders** page

---

## Common Commands

### Check if services are running:
```bash
docker-compose -f docker-compose.prod.yml ps
```

### View logs:
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f product-service
```

### Check health:
```bash
curl http://localhost:8080/health
```

### Stop everything:
```bash
docker-compose -f docker-compose.prod.yml down
```

Or double-click: `stop-prod.bat`

### Remove all data (start fresh):
```bash
docker-compose -f docker-compose.prod.yml down -v
```

---

## Troubleshooting

### Frontend shows "ENOMEM" error
The fix is already applied! Just rebuild:
```bash
docker-compose -f docker-compose.prod.yml up --build --force-recreate frontend
```

### Services won't start
```bash
# Clean rebuild
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up --build
```

### Can't connect to backend
- Wait 30-60 seconds for all services to start
- Check health: `curl http://localhost:8080/health`
- All services should show "healthy"

### Port already in use
```bash
# Find what's using the port (e.g., 3000)
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F
```

---

## Architecture

```
Frontend (React)
    ↓
API Gateway :8080
    ↓
┌─────────┬──────────┬─────────┬─────────┬─────────────┐
│  User   │ Product  │  Order  │ Payment │Notification│
│ :3001   │  :3002   │  :3003  │  :3004  │   :3005    │
└────┬────┴────┬─────┴────┬────┴────┬────┴──────┬─────┘
     │         │          │         │           │
  user_db  product_db  order_db payment_db  notif_db
           + Redis
```

---

## API Endpoints

All endpoints go through API Gateway: `http://localhost:8080`

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product
- `GET /api/categories` - List categories

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - List orders
- `GET /api/orders/:id` - Order details

### Authentication
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

---

## What's Next?

1. **Explore the code** - Check out service implementations
2. **Add features** - Extend the microservices
3. **Deploy to cloud** - See `DEPLOYMENT_GUIDE.md` for AWS
4. **Learn the patterns** - Study microservices architecture

---

## Documentation

- `README.md` - Complete documentation
- `SETUP_GUIDE.md` - Detailed setup
- `ARCHITECTURE.md` - Architecture details
- `DEPLOYMENT_GUIDE.md` - AWS deployment

---

**Need Help?** Check the logs first:
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

Good luck! 🚀
