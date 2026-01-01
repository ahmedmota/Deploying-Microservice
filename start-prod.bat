@echo off
echo ========================================
echo E-Commerce Microservices Platform
echo PRODUCTION MODE
echo ========================================
echo.
echo Starting all services in production mode...
echo.

docker-compose -f docker-compose.prod.yml up --build

echo.
echo ========================================
echo Services stopped
echo ========================================
