@echo off
REM Centralized API Gateway Startup Script
REM Starts the load-balanced API Gateway with all microservices

echo ========================================
echo   LOG430 Lab 5 - API Gateway Startup
echo   Load Balanced Configuration
echo ========================================
echo.

REM Navigate to the API Gateway directory
cd /d "%~dp0..\..\api-gateway"
echo.

echo Checking if Docker is running...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo  Docker is running
echo.

echo Setting up environment variables...
if not exist .env (
    echo Creating .env file from template...
    copy .env .env.backup >nul 2>&1
)
echo  Environment configured
echo.

echo Stopping any existing containers...
docker-compose -f docker-compose.loadbalanced.yml down
docker-compose -f docker-compose.gateway.yml down >nul 2>&1
echo.

echo Building and starting all services with load balancing...
echo This may take several minutes on first run...
echo.
echo  Services being started:
echo - Kong API Gateway (1 instance)
echo - Product Service (2 instances - Load Balanced)
echo - Stock Service (2 instances - Load Balanced)
echo - Cart Service (2 instances - Load Balanced)
echo - User Service (1 instance)
echo - Store Service (1 instance)
echo - Sales Service (1 instance)
echo - Refund Service (1 instance)
echo - PostgreSQL Database
echo - Redis Cache
echo - Prometheus Monitoring
echo - Grafana Dashboards
echo.

docker-compose -f docker-compose.loadbalanced.yml up -d --build
echo.

echo Waiting for services to be ready...
echo This can take up to 2 minutes for all health checks to pass...
timeout /t 60 /nobreak >nul
echo.

echo Checking service status...
docker-compose -f docker-compose.loadbalanced.yml ps
echo.

echo Checking Kong upstream configuration...
timeout /t 30 /nobreak >nul
curl -s http://localhost:8001/upstreams 2>nul | jq . 2>nul >nul
if %errorlevel% neq 0 (
    echo ⏳ Kong upstreams configuration not yet available, services still starting...
) else (
    echo [OK] Kong upstreams configured successfully
)
echo.

echo ========================================
echo   Load Balanced Gateway Started!
echo ========================================
echo.
echo Access Points:
echo - Gateway URL: http://localhost:8000
echo - Admin API: http://localhost:8001
echo - Prometheus: http://localhost:9090
echo - Grafana: http://localhost:3100 (admin/admin)
echo.
echo    Load Balanced Services:
echo - Product Service: 2 instances (ports 3001, 3011)
echo - Stock Service: 2 instances (ports 3004, 3014)
echo - Cart Service: 2 instances (ports 3007, 3017)
echo.
echo Single Instance Services:
echo - User Service: port 3002
echo - Store Service: port 3003
echo - Sales Service: port 3005
echo - Refund Service: port 3006
echo.
echo Next Steps:
echo - Test load balancing: scripts\test-gateway.bat
echo - View logs: scripts\view-logs.bat
echo - Check status: scripts\system-status.bat
echo - Stop services: scripts\stop-gateway.bat
echo.
echo [OK] Gateway is ready for requests!

REM Return to scripts directory
cd /d "%~dp0"
pause
