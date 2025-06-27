@echo off
REM Script to stop all running services for LOG430 Lab 5
REM Stops Kong API Gateway, microservices, and frontend

echo ========================================
echo   LOG430 Lab 5 - Stop All Services
echo ========================================
echo.

echo Checking if Docker is running...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker not running! Nothing to stop.
    pause
    exit /b 1
)

echo.
echo Step 1: Stopping Kong API Gateway...
docker stop kong-gateway >nul 2>&1
docker rm kong-gateway >nul 2>&1
echo Kong API Gateway stopped.

echo.
echo Step 2: Stopping all microservices...
cd /d "%~dp0..\.."
docker-compose down -v
echo All microservices stopped.

echo.
echo Step 3: Cleaning up networks...
docker network rm kong-network >nul 2>&1
echo Networks cleaned up.

echo.
echo Step 4: Checking for any remaining containers...
docker ps -a | findstr "log430-lab5"
echo.

echo All services have been stopped successfully!
echo. 