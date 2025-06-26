@echo off
REM Start Load Balanced API Gateway with all microservices
REM This script starts the complete stack with multiple instances of critical services
REM Updated to always use load balancing for better performance and reliability

echo ========================================
echo   Starting Load Balanced API Gateway
echo ========================================
echo.

echo Checking if Docker is running...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo OK: Docker is running
echo.

echo Setting up environment variables...
if not exist .env (
    echo Creating .env file from template...
    copy .env .env.backup >nul 2>&1
)
echo Environment configured
echo.

echo Stopping any existing containers...
docker-compose -f docker-compose.loadbalanced.yml down
docker-compose -f docker-compose.gateway.yml down >nul 2>&1
echo.

echo Building and starting all services with load balancing...
echo This may take several minutes on first run...
echo.
echo Services being started:
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
curl -s http://localhost:8001/upstreams 2>nul | jq . 2>nul
if %errorlevel% neq 0 (
    echo Kong upstreams configuration not yet available, services still starting...
) else (
    echo Kong upstreams configured successfully
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
echo - Grafana: http://localhost:3100 ^(admin/admin^)
echo.
echo Load Balanced Services:
echo - Product Service: 2 instances ^(ports 3001, 3011^)
echo - Stock Service: 2 instances ^(ports 3004, 3014^)
echo - Cart Service: 2 instances ^(ports 3017, 3017^)
echo.
echo Single Instance Services:
echo - User Service: port 3002
echo - Store Service: port 3003
echo - Sales Service: port 3005
echo - Refund Service: port 3006
echo.
echo To test load balancing: test-loadbalancing.bat
echo To view logs: docker-compose -f docker-compose.loadbalanced.yml logs -f
echo To stop: docker-compose -f docker-compose.loadbalanced.yml down
echo.
echo Gateway is ready for requests!
echo.

pause
