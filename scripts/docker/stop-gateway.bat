@echo off
REM Centralized API Gateway Stop Script
REM Stops all API Gateway services and microservices

echo ========================================
echo   LOG430 Lab 5 - Stop API Gateway
echo ========================================
echo.

REM Navigate to the API Gateway directory
cd /d "%~dp0..\..\api-gateway"

echo Stopping all services...
docker-compose -f docker-compose.loadbalanced.yml down
docker-compose -f docker-compose.gateway.yml down >nul 2>&1
echo.

echo Cleaning up containers...
docker-compose -f docker-compose.loadbalanced.yml rm -f
docker-compose -f docker-compose.gateway.yml rm -f >nul 2>&1
echo.

echo ========================================
echo   All services stopped successfully!
echo ========================================
echo.
echo  Options:
echo - Start again: scripts\start-gateway.bat
echo - Complete restart: scripts\clean-restart.bat
echo - Remove volumes: docker-compose -f api-gateway\docker-compose.loadbalanced.yml down -v
echo.

REM Return to scripts directory
cd /d "%~dp0"
pause
