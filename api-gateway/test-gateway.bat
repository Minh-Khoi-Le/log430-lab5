@echo off
REM Load Balanced API Gateway Test Script
REM Tests Kong Gateway functionality, service routing, and load balancing

echo ========================================
echo   Load Balanced API Gateway Test
echo ========================================
echo.

echo Testing Kong Gateway Health...
curl -s http://localhost:8001/status
if %errorlevel% neq 0 (
    echo ERROR: Kong Gateway is not running!
    echo Make sure to run: start-gateway.bat
    pause
    exit /b 1
)
echo OK: Kong Gateway is running
echo.

echo Testing Kong Services Configuration...
curl -s http://localhost:8001/services | jq .
echo.

echo Testing Kong Routes Configuration...
curl -s http://localhost:8001/routes | jq .
echo.

echo Testing Kong Upstreams Configuration ^(Load Balancing^)...
curl -s http://localhost:8001/upstreams | jq .
echo.

echo Testing Product Service through Gateway ^(Load Balanced^)...
echo Making multiple requests to test load balancing...
for /l %%i in (1,1,3) do (
    echo Request %%i:
    curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/products/health
    echo.
)
echo.

echo Testing User Service through Gateway...
curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/users/health
if %errorlevel% neq 0 (
    echo ERROR: Cannot reach User Service through gateway
) else (
    echo OK: User Service accessible through gateway
)
echo.

echo Testing Store Service through Gateway...
curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/stores/health
if %errorlevel% neq 0 (
    echo ERROR: Cannot reach Store Service through gateway
) else (
    echo OK: Store Service accessible through gateway
)
echo.

echo Testing Stock Service through Gateway...
curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/stock/health
if %errorlevel% neq 0 (
    echo ERROR: Cannot reach Stock Service through gateway
) else (
    echo OK: Stock Service accessible through gateway
)
echo.

echo Testing Sales Service through Gateway...
curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/sales/health
if %errorlevel% neq 0 (
    echo ERROR: Cannot reach Sales Service through gateway
) else (
    echo OK: Sales Service accessible through gateway
)
echo.

echo Testing Refund Service through Gateway...
curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/refunds/health
if %errorlevel% neq 0 (
    echo ERROR: Cannot reach Refund Service through gateway
) else (
    echo OK: Refund Service accessible through gateway
)
echo.

echo Testing Cart Service through Gateway...
curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/cart/health
if %errorlevel% neq 0 (
    echo ERROR: Cannot reach Cart Service through gateway
) else (
    echo OK: Cart Service accessible through gateway
)
echo.

echo Testing Rate Limiting...
echo Making multiple requests to test rate limiting...
for /L %%i in (1,1,5) do (
    curl -s -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/products/health > nul
    echo Request %%i completed
)
echo.

echo Testing API Key Authentication...
echo Testing without API key ^(should fail^)...
curl -s -w "HTTP Status: %%{http_code}\n" -o nul http://localhost:8000/api/products/health
echo.

echo Testing with invalid API key ^(should fail^)...
curl -s -w "HTTP Status: %%{http_code}\n" -o nul -H "X-API-Key: invalid-key" http://localhost:8000/api/products/health
echo.

echo Testing Prometheus Metrics...
curl -s http://localhost:8001/metrics | findstr kong_http_requests_total
if %errorlevel% neq 0 (
    echo ERROR: Prometheus metrics not available
) else (
    echo OK: Prometheus metrics are being collected
)
echo.

echo ========================================
echo   Gateway Test Summary
echo ========================================
echo.
echo Gateway URL: http://localhost:8000
echo Admin API: http://localhost:8001
echo Prometheus: http://localhost:9090
echo Grafana: http://localhost:3100
echo.
echo API Keys:
echo - Frontend: frontend-app-key-12345
echo - Testing: testing-key-xyz123
echo.
echo Example Usage:
echo curl -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/products
echo.

pause
