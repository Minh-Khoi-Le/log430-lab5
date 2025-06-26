@echo off
REM C        echo [OK]       echo [OK] Kong Gatewa    cur    cur    cuccccurl ddocker-compose -f docker-compose.loadbalanced.yml exec -T redis redis-cli ping >nul 2>&1 && echo [OK] Redis Cache || echo [FAIL] Redis Cachecker-compose -f docker-compose.loadbalanced.yml exec -T postgres pg_isready >nul 2>&1 && echo [OK] PostgreSQL Database || echo [FAIL] PostgreSQL Databases -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/refunds/health >nul 2>&1 && echo [OK] Refund Service || echo [FAIL] Refund Servicerl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/sales/health >nul 2>&1 && echo [OK] Sales Service || echo [FAIL] Sales Servicerl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/stores/health >nul 2>&1 && echo [OK] Store Service || echo [FAIL] Store Servicerl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/users/health >nul 2>&1 && echo [OK] User Service || echo [FAIL] User Servicel -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/cart/health 2>nul | find "instance" >nul && echo "[OK] Instance responded" || echo "[INFO] Response received" -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/stock/health 2>nul | find "instance" >nul && echo "[OK] Instance responded" || echo "[INFO] Response received" -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/products/health 2>nul | find "instance" >nul && echo "[OK] Instance responded" || echo "[INFO] Response received" is healthyecho [FAIL] Kong Gateway is not respondingDocker is runningcho [FAIL] Docker is not running!ntralized System Status Check
REM Provides comprehensive status information about all services

echo ========================================
echo   LOG430 Lab 5 - System Status
echo ========================================
echo.

REM Navigate to the API Gateway directory
cd /d "%~dp0..\..\api-gateway"

echo  Docker System Status
echo ========================
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo  Docker is not running!
    echo Please start Docker Desktop and try again.
    goto :end
) else (
    echo  Docker is running
)
echo.

echo  Container Status
echo ===================
docker-compose -f docker-compose.loadbalanced.yml ps
echo.

echo  Kong Gateway Health
echo ======================
curl -s http://localhost:8001/status 2>nul >nul
if %errorlevel% neq 0 (
    echo  Kong Gateway is not responding
    echo Try: scripts\start-gateway.bat
) else (
    echo  Kong Gateway is healthy
    curl -s http://localhost:8001/status | jq . 2>nul || echo "Status OK"
)
echo.

echo Load Balancer Configuration
echo ===============================
echo Checking Kong upstreams...
curl -s http://localhost:8001/upstreams 2>nul | find "product-service-upstream" >nul
if %errorlevel% neq 0 (
    echo [ISSUE] Load balancer upstreams not configured
) else (
    echo [OK] Load balancer upstreams configured
    echo.
    echo Upstream Details:
    curl -s http://localhost:8001/upstreams | jq -r '.data[] | "\(.name): \(.algorithm) algorithm"' 2>nul || echo "Upstreams configured"
)
echo.

echo Service Instance Status
echo ===========================

echo Testing Product Service Load Balancing...
for /l %%i in (1,1,3) do (
    echo   Request %%i: 
    curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/products/health 2>nul | find "instance" >nul && echo " Instance responded" || echo " Response received"
)
echo.

echo Testing Stock Service Load Balancing...
for /l %%i in (1,1,3) do (
    echo   Request %%i:
    curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/stock/health 2>nul | find "instance" >nul && echo " Instance responded" || echo " Response received"
)
echo.

echo Testing Cart Service Load Balancing...
for /l %%i in (1,1,3) do (
    echo   Request %%i:
    curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/cart/health 2>nul | find "instance" >nul && echo " Instance responded" || echo " Response received"
)
echo.

echo Single Instance Services
echo ============================
curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/users/health >nul 2>&1 && echo  User Service || echo  User Service
curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/stores/health >nul 2>&1 && echo  Store Service || echo  Store Service
curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/sales/health >nul 2>&1 && echo  Sales Service || echo  Sales Service
curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/refunds/health >nul 2>&1 && echo  Refund Service || echo  Refund Service
echo.

echo Infrastructure Services
echo ===========================
docker-compose -f docker-compose.loadbalanced.yml exec -T postgres pg_isready >nul 2>&1 && echo  PostgreSQL Database || echo  PostgreSQL Database
docker-compose -f docker-compose.loadbalanced.yml exec -T redis redis-cli ping >nul 2>&1 && echo  Redis Cache || echo  Redis Cache
curl -s http://localhost:9090/-/healthy >nul 2>&1 && echo [OK] Prometheus Monitoring || echo [FAIL] Prometheus Monitoring
curl -s http://localhost:3100/api/health >nul 2>&1 && echo [OK] Grafana Dashboards || echo [FAIL] Grafana Dashboards
echo.

echo  System Summary
echo =================
echo  Load Balanced Services:
echo   • Product Service: 2 instances (ports 3001, 3011)
echo   • Stock Service: 2 instances (ports 3004, 3014)
echo   • Cart Service: 2 instances (ports 3007, 3017)
echo.
echo  Single Instance Services:
echo   • User Service (port 3002)
echo   • Store Service (port 3003)
echo   • Sales Service (port 3005)
echo   • Refund Service (port 3006)
echo.
echo  Access Points:
echo   • API Gateway: http://localhost:8000
echo   • Kong Admin: http://localhost:8001
echo   • Prometheus: http://localhost:9090
echo   • Grafana: http://localhost:3100 (admin/admin)
echo.

:end
REM Return to scripts directory
cd /d "%~dp0"
pause
