@echo off
REM Stop Script for LOG430 Lab 5
REM This script stops all microservices, Kong API Gateway, Redis, and the web client

echo ========================================
echo   LOG430 Lab 5 - Stop All Services
echo ========================================
echo.

echo This script will stop:
echo [OK] All Docker containers
echo [OK] Remove related networks
echo.

cd /d "%~dp0.."
echo Stopping all containers...
docker-compose down --remove-orphans

echo Cleaning up networks...
docker network prune -f > nul 2>&1

echo.
echo All services have been stopped successfully!
echo Press any key to exit...
pause
