# Production-Grade Folder Structure

```
ecommerce-microservices/
│
├─── services/                          # All microservices code
│    ├─── user-service/
│    │    ├─── src/
│    │    │    ├─── config/
│    │    │    │    ├─── database.js
│    │    │    │    ├─── redis.js
│    │    │    │    └─── config.js
│    │    │    ├─── controllers/
│    │    │    │    ├─── auth.controller.js
│    │    │    │    └─── user.controller.js
│    │    │    ├─── middleware/
│    │    │    │    ├─── auth.middleware.js
│    │    │    │    ├─── error.middleware.js
│    │    │    │    └─── validation.middleware.js
│    │    │    ├─── models/
│    │    │    │    ├─── user.model.js
│    │    │    │    └─── profile.model.js
│    │    │    ├─── routes/
│    │    │    │    ├─── auth.routes.js
│    │    │    │    └─── user.routes.js
│    │    │    ├─── services/
│    │    │    │    ├─── auth.service.js
│    │    │    │    └─── user.service.js
│    │    │    ├─── utils/
│    │    │    │    ├─── logger.js
│    │    │    │    ├─── jwt.js
│    │    │    │    └─── errors.js
│    │    │    ├─── validators/
│    │    │    │    └─── user.validator.js
│    │    │    ├─── app.js
│    │    │    └─── server.js
│    │    ├─── tests/
│    │    │    ├─── unit/
│    │    │    └─── integration/
│    │    ├─── migrations/
│    │    │    └─── 001_create_users_table.sql
│    │    ├─── Dockerfile
│    │    ├─── .dockerignore
│    │    ├─── package.json
│    │    ├─── .env.example
│    │    └─── README.md
│    │
│    ├─── product-service/
│    │    ├─── src/
│    │    │    ├─── config/
│    │    │    │    ├─── database.js
│    │    │    │    ├─── redis.js
│    │    │    │    └─── config.js
│    │    │    ├─── controllers/
│    │    │    │    ├─── product.controller.js
│    │    │    │    └─── category.controller.js
│    │    │    ├─── middleware/
│    │    │    │    ├─── auth.middleware.js
│    │    │    │    ├─── error.middleware.js
│    │    │    │    └─── cache.middleware.js
│    │    │    ├─── models/
│    │    │    │    ├─── product.model.js
│    │    │    │    ├─── category.model.js
│    │    │    │    └─── inventory.model.js
│    │    │    ├─── routes/
│    │    │    │    ├─── product.routes.js
│    │    │    │    └─── category.routes.js
│    │    │    ├─── services/
│    │    │    │    ├─── product.service.js
│    │    │    │    └─── cache.service.js
│    │    │    ├─── utils/
│    │    │    │    ├─── logger.js
│    │    │    │    └─── errors.js
│    │    │    ├─── validators/
│    │    │    │    └─── product.validator.js
│    │    │    ├─── app.js
│    │    │    └─── server.js
│    │    ├─── tests/
│    │    ├─── migrations/
│    │    │    ├─── 001_create_products_table.sql
│    │    │    └─── 002_create_categories_table.sql
│    │    ├─── Dockerfile
│    │    ├─── package.json
│    │    └─── README.md
│    │
│    ├─── order-service/
│    │    ├─── src/
│    │    │    ├─── config/
│    │    │    │    ├─── database.js
│    │    │    │    ├─── sqs.js
│    │    │    │    └─── config.js
│    │    │    ├─── controllers/
│    │    │    │    └─── order.controller.js
│    │    │    ├─── middleware/
│    │    │    │    ├─── auth.middleware.js
│    │    │    │    └─── error.middleware.js
│    │    │    ├─── models/
│    │    │    │    ├─── order.model.js
│    │    │    │    └─── orderItem.model.js
│    │    │    ├─── routes/
│    │    │    │    └─── order.routes.js
│    │    │    ├─── services/
│    │    │    │    ├─── order.service.js
│    │    │    │    ├─── queue.service.js
│    │    │    │    └─── product-client.service.js
│    │    │    ├─── consumers/
│    │    │    │    └─── payment-consumer.js
│    │    │    ├─── utils/
│    │    │    │    ├─── logger.js
│    │    │    │    └─── errors.js
│    │    │    ├─── validators/
│    │    │    │    └─── order.validator.js
│    │    │    ├─── app.js
│    │    │    └─── server.js
│    │    ├─── tests/
│    │    ├─── migrations/
│    │    │    └─── 001_create_orders_table.sql
│    │    ├─── Dockerfile
│    │    ├─── package.json
│    │    └─── README.md
│    │
│    ├─── payment-service/
│    │    ├─── src/
│    │    │    ├─── config/
│    │    │    │    ├─── database.js
│    │    │    │    ├─── sqs.js
│    │    │    │    └─── config.js
│    │    │    ├─── controllers/
│    │    │    │    └─── payment.controller.js
│    │    │    ├─── middleware/
│    │    │    │    ├─── auth.middleware.js
│    │    │    │    ├─── error.middleware.js
│    │    │    │    └─── idempotency.middleware.js
│    │    │    ├─── models/
│    │    │    │    ├─── payment.model.js
│    │    │    │    └─── transaction.model.js
│    │    │    ├─── routes/
│    │    │    │    └─── payment.routes.js
│    │    │    ├─── services/
│    │    │    │    ├─── payment.service.js
│    │    │    │    └─── queue.service.js
│    │    │    ├─── consumers/
│    │    │    │    └─── order-consumer.js
│    │    │    ├─── utils/
│    │    │    │    ├─── logger.js
│    │    │    │    └─── errors.js
│    │    │    ├─── validators/
│    │    │    │    └─── payment.validator.js
│    │    │    ├─── app.js
│    │    │    └─── server.js
│    │    ├─── tests/
│    │    ├─── migrations/
│    │    │    └─── 001_create_payments_table.sql
│    │    ├─── Dockerfile
│    │    ├─── package.json
│    │    └─── README.md
│    │
│    └─── notification-service/
│         ├─── src/
│         │    ├─── config/
│         │    │    ├─── database.js
│         │    │    ├─── sqs.js
│         │    │    ├─── ses.js
│         │    │    └─── config.js
│         │    ├─── controllers/
│         │    │    └─── notification.controller.js
│         │    ├─── middleware/
│         │    │    └─── error.middleware.js
│         │    ├─── models/
│         │    │    └─── notification.model.js
│         │    ├─── routes/
│         │    │    └─── notification.routes.js
│         │    ├─── services/
│         │    │    ├─── email.service.js
│         │    │    └─── queue.service.js
│         │    ├─── consumers/
│         │    │    └─── notification-consumer.js
│         │    ├─── templates/
│         │    │    ├─── order-confirmation.html
│         │    │    └─── payment-success.html
│         │    ├─── utils/
│         │    │    ├─── logger.js
│         │    │    └─── errors.js
│         │    ├─── app.js
│         │    └─── server.js
│         ├─── tests/
│         ├─── migrations/
│         │    └─── 001_create_notifications_table.sql
│         ├─── Dockerfile
│         ├─── package.json
│         └─── README.md
│
├─── infrastructure/                    # Terraform IaC (You'll create this)
│    ├─── environments/
│    │    ├─── dev/
│    │    │    ├─── main.tf
│    │    │    ├─── variables.tf
│    │    │    └─── terraform.tfvars
│    │    ├─── staging/
│    │    └─── production/
│    ├─── modules/
│    │    ├─── vpc/
│    │    ├─── eks/
│    │    ├─── rds/
│    │    ├─── elasticache/
│    │    ├─── sqs/
│    │    ├─── ecr/
│    │    ├─── alb/
│    │    ├─── waf/
│    │    ├─── cloudfront/
│    │    ├─── secrets/
│    │    └─── monitoring/
│    └─── README.md
│
├─── kubernetes/                        # K8s manifests (You'll create this)
│    ├─── base/
│    │    ├─── namespace.yaml
│    │    ├─── configmap.yaml
│    │    └─── secrets.yaml
│    ├─── services/
│    │    ├─── user-service/
│    │    │    ├─── deployment.yaml
│    │    │    ├─── service.yaml
│    │    │    ├─── hpa.yaml
│    │    │    └─── ingress.yaml
│    │    ├─── product-service/
│    │    ├─── order-service/
│    │    ├─── payment-service/
│    │    └─── notification-service/
│    ├─── monitoring/
│    │    ├─── prometheus/
│    │    └─── grafana/
│    └─── README.md
│
├─── .github/                           # CI/CD (You'll create this)
│    └─── workflows/
│         ├─── user-service.yml
│         ├─── product-service.yml
│         ├─── order-service.yml
│         ├─── payment-service.yml
│         ├─── notification-service.yml
│         └─── infrastructure.yml
│
├─── scripts/                           # Helper scripts
│    ├─── setup-local.sh
│    ├─── deploy.sh
│    ├─── rollback.sh
│    └─── health-check.sh
│
├─── docs/                              # Documentation
│    ├─── API.md
│    ├─── DEPLOYMENT.md
│    ├─── ARCHITECTURE.md
│    └─── RUNBOOK.md
│
├─── docker-compose.yml                 # Local development
├─── .gitignore
├─── README.md
└─── Makefile                           # Common commands

```

## Key Folder Structure Principles

### 1. **Service Isolation**
Each microservice is completely independent with its own:
- Dependencies (package.json)
- Database migrations
- Tests
- Dockerfile
- Configuration

### 2. **Layered Architecture per Service**
```
Controllers → Services → Models → Database
      ↓
  Middleware
      ↓
  Validators
```

### 3. **Shared Patterns**
All services follow the same structure for consistency:
- `config/` - Configuration and connections
- `controllers/` - Request handlers
- `middleware/` - Cross-cutting concerns
- `models/` - Database models
- `routes/` - API routes
- `services/` - Business logic
- `utils/` - Helper functions
- `validators/` - Input validation

### 4. **Infrastructure as Code**
Separate `infrastructure/` folder for Terraform:
- Environment-based folders (dev/staging/prod)
- Reusable modules
- Clear separation from application code

### 5. **Kubernetes Manifests**
Separate `kubernetes/` folder for K8s configs:
- Base configurations
- Service-specific deployments
- Monitoring setup

### 6. **CI/CD**
GitHub Actions workflows in `.github/workflows/`:
- One workflow per service
- Separate infrastructure pipeline
- Automated testing and deployment

## File Naming Conventions

- **JavaScript files**: `kebab-case.js` (e.g., `user.controller.js`)
- **Configuration files**: `lowercase.js` (e.g., `database.js`)
- **Test files**: `*.test.js` or `*.spec.js`
- **Docker files**: `Dockerfile` (capital D)
- **Kubernetes files**: `kebab-case.yaml`
- **Terraform files**: `lowercase.tf`

## Environment Variables Pattern

Each service will have:
```
.env.example          # Template with placeholder values
.env.development      # Local dev config (gitignored)
.env.staging          # Staging config (gitignored)
.env.production       # Production config (gitignored)
```

## Code Organization Best Practices

### Controllers
- Handle HTTP requests/responses
- Call services for business logic
- Return appropriate status codes
- No business logic here

### Services
- Business logic implementation
- Database operations
- External API calls
- Transaction management

### Models
- Database schema definitions
- Model relationships
- Query helpers
- Validations

### Middleware
- Authentication/Authorization
- Request validation
- Error handling
- Logging
- Rate limiting

### Utils
- Reusable helper functions
- Logger configuration
- Common utilities
- No business logic

This structure ensures:
✅ Scalability (easy to add new services)
✅ Maintainability (consistent patterns)
✅ Testability (isolated components)
✅ DevOps-friendly (clear deployment units)
✅ Production-ready (follows industry standards)
