@echo off
echo ========================================
echo E-Commerce Microservices Platform
echo ========================================
echo.
echo Starting all services with Docker Compose...
echo.
echo This will start:
echo - 5 PostgreSQL databases
echo - Redis
echo - 5 Microservices
echo - API Gateway
echo - React Frontend
echo.
echo Please wait...
echo.

docker-compose up --build

echo.
echo ========================================
echo Services stopped
echo ========================================
