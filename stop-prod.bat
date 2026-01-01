@echo off
echo ========================================
echo Stopping production services...
echo ========================================
echo.

docker-compose -f docker-compose.prod.yml down

echo.
echo ========================================
echo All services stopped
echo ========================================
