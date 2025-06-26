@echo off
REM System Status Check for Load Balanced API Gateway
REM Provides comprehensive status information about all services

echo ========================================
echo   Load Balanced System Status Check
echo ========================================
echo.

echo 1. Docker System Status
echo ========================
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running!
    echo Please start Docker Desktop and try again.
    goto :end
) else (
    echo ✅ Docker is running
)
echo.

echo 2. Container Status
echo ===================
docker-compose -f docker-compose.loadbalanced.yml ps
echo.

echo 3. Kong Gateway Health
echo ======================
curl -s http://localhost:8001/status 2>nul
if %errorlevel% neq 0 (
    echo ❌ Kong Gateway is not responding
    echo Try: start-gateway.bat
) else (
    echo ✅ Kong Gateway is healthy
)
echo.

echo 4. Load Balancer Configuration
echo ===============================
echo Checking Kong upstreams...
curl -s http://localhost:8001/upstreams 2>nul | find "product-service-upstream" >nul
if %errorlevel% neq 0 (
    echo ❌ Load balancer upstreams not configured
) else (
    echo ✅ Load balancer upstreams configured
)
echo.

echo 5. Service Instance Status
echo ===========================

echo Testing Product Service Load Balancing...
for /l %%i in (1,1,3) do (
    echo   Request %%i: 
    curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/products/health 2>nul | find "instance" || echo "Response received"
)
echo.

echo Testing Stock Service Load Balancing...
for /l %%i in (1,1,3) do (
    echo   Request %%i:
    curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/stock/health 2>nul | find "instance" || echo "Response received"
)
echo.

echo Testing Cart Service Load Balancing...
for /l %%i in (1,1,3) do (
    echo   Request %%i:
    curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/cart/health 2>nul | find "instance" || echo "Response received"
)
echo.

echo 6. Single Instance Services
echo ============================
curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/users/health >nul 2>&1 && echo ✅ User Service || echo ❌ User Service
curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/stores/health >nul 2>&1 && echo ✅ Store Service || echo ❌ Store Service
curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/sales/health >nul 2>&1 && echo ✅ Sales Service || echo ❌ Sales Service
curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/refunds/health >nul 2>&1 && echo ✅ Refund Service || echo ❌ Refund Service
echo.

echo 7. Infrastructure Services
echo ===========================
docker-compose -f docker-compose.loadbalanced.yml exec -T postgres pg_isready >nul 2>&1 && echo ✅ PostgreSQL Database || echo ❌ PostgreSQL Database
docker-compose -f docker-compose.loadbalanced.yml exec -T redis redis-cli ping >nul 2>&1 && echo ✅ Redis Cache || echo ❌ Redis Cache
curl -s http://localhost:9090/-/healthy >nul 2>&1 && echo ✅ Prometheus Monitoring || echo ❌ Prometheus Monitoring
curl -s http://localhost:3100/api/health >nul 2>&1 && echo ✅ Grafana Dashboards || echo ❌ Grafana Dashboards
echo.

echo 8. System Summary
echo =================
echo Load Balanced Services:
echo   • Product Service: 2 instances (ports 3001, 3011)
echo   • Stock Service: 2 instances (ports 3004, 3014)
echo   • Cart Service: 2 instances (ports 3007, 3017)
echo.
echo Single Instance Services:
echo   • User Service (port 3002)
echo   • Store Service (port 3003)
echo   • Sales Service (port 3005)
echo   • Refund Service (port 3006)
echo.
echo Access Points:
echo   • API Gateway: http://localhost:8000
echo   • Kong Admin: http://localhost:8001
echo   • Prometheus: http://localhost:9090
echo   • Grafana: http://localhost:3100 (admin/admin)
echo.

:end
pause
