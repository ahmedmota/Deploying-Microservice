# User Service

Authentication and user management microservice for the e-commerce platform.

## Features

- User registration and authentication
- JWT-based authentication with refresh tokens
- Profile management
- Password management with security features
- Role-based access control (RBAC)
- Account locking after failed login attempts
- Redis caching for improved performance
- PostgreSQL database with paranoid mode (soft delete)
- Production-ready logging with Winston
- Input validation with express-validator
- Comprehensive error handling
- Health checks and metrics endpoints
- Docker support with multi-stage builds

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 14+
- **Cache**: Redis 7+
- **Authentication**: JWT (jsonwebtoken)
- **ORM**: Sequelize
- **Validation**: express-validator
- **Security**: helmet, bcrypt
- **Logging**: winston

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user (requires auth)
- `POST /api/auth/refresh` - Refresh access token (requires auth)
- `GET /api/auth/me` - Get current user info (requires auth)

### Users

- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID (requires auth)
- `PUT /api/users/profile` - Update user profile (requires auth)
- `PUT /api/users/password` - Change password (requires auth)
- `DELETE /api/users/:id` - Delete user (admin only)

### Health & Metrics

- `GET /health` - Health check endpoint
- `GET /metrics` - Metrics endpoint

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Redis 7+ installed and running

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run database migrations:
```bash
npm run migrate
```

4. Start the service:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## Environment Variables

See `.env.example` for all required environment variables:

```env
NODE_ENV=development
PORT=3001
SERVICE_NAME=user-service

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=userdb
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

## Docker

### Build Docker Image

```bash
docker build -t user-service:latest .
```

### Run with Docker

```bash
docker run -p 3001:3001 --env-file .env user-service:latest
```

### Docker Compose (with dependencies)

```bash
docker-compose up -d
```

## Database Schema

### Users Table
- `id` (UUID, PK)
- `email` (VARCHAR, unique)
- `password_hash` (VARCHAR)
- `name` (VARCHAR)
- `phone` (VARCHAR)
- `role` (VARCHAR: user, admin, moderator)
- `status` (VARCHAR: active, inactive, suspended, pending)
- `email_verified` (BOOLEAN)
- `email_verified_at` (TIMESTAMP)
- `last_login_at` (TIMESTAMP)
- `last_login_ip` (VARCHAR)
- `failed_login_attempts` (INTEGER)
- `locked_until` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `deleted_at` (TIMESTAMP)

### Profiles Table
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `avatar_url` (VARCHAR)
- `bio` (TEXT)
- `date_of_birth` (DATE)
- `gender` (VARCHAR)
- `address_line1` (VARCHAR)
- `address_line2` (VARCHAR)
- `city` (VARCHAR)
- `state` (VARCHAR)
- `country` (VARCHAR)
- `postal_code` (VARCHAR)
- `notification_preferences` (JSONB)
- `preferences` (JSONB)
- `metadata` (JSONB)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Security Features

- Password hashing with bcrypt (10 rounds)
- JWT access tokens (15 minutes expiry)
- JWT refresh tokens (7 days expiry)
- Account lockout after 5 failed login attempts (15 minutes)
- Token blacklisting on logout
- Rate limiting (100 requests per 15 minutes)
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- CORS configuration
- Helmet security headers
- HTTPS only in production

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Logging

Logs are stored in the `logs/` directory:
- `combined.log` - All logs
- `error.log` - Error logs only

Log format includes:
- Timestamp
- Log level
- Service name
- Request ID (for tracing)
- Message
- Stack trace (for errors)

## Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "service": "user-service",
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": "5ms"
    },
    "redis": {
      "status": "healthy",
      "responseTime": "2ms"
    }
  }
}
```

### Metrics
```bash
curl http://localhost:3001/metrics
```

## Development

### Project Structure
```
user-service/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── validators/      # Input validators
│   ├── app.js          # Express app setup
│   └── server.js       # Server entry point
├── migrations/         # Database migrations
├── tests/             # Test files
├── logs/              # Log files
├── Dockerfile         # Docker configuration
├── package.json       # Dependencies
└── README.md          # Documentation
```

### Code Style

- ESLint for code linting
- Prettier for code formatting
- 2 spaces indentation
- Single quotes for strings
- Semicolons required

### Git Workflow

1. Create feature branch from `main`
2. Make changes and commit
3. Push to remote and create PR
4. Wait for CI/CD checks to pass
5. Merge after review

## Production Deployment

### AWS EKS Deployment

1. Build and push Docker image to ECR
2. Update Kubernetes manifests
3. Apply changes to cluster
4. Verify deployment health

### Environment-specific Configs

- Development: `.env.development`
- Staging: `.env.staging`
- Production: `.env.production`

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in .env
- Ensure database exists and is accessible

### Redis Connection Issues
- Verify Redis is running
- Check Redis host and port in .env
- Test Redis connection with `redis-cli ping`

### Authentication Errors
- Verify JWT secrets are configured
- Check token expiry settings
- Ensure Redis is working for token blacklist

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open a GitHub issue or contact the development team.
