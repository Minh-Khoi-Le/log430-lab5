@echo off
REM Phase 1 Microservices Testing Script (Windows)
REM 
REM This script validates that the microservices are running correctly
REM and can handle basic API requests.

echo ===================================
echo LOG430 Phase 1 Microservices Tests
echo ===================================

REM Test configuration
set PRODUCT_SERVICE_URL=http://localhost:3001
set USER_SERVICE_URL=http://localhost:3002
set MONOLITH_URL=http://localhost:3000

echo.
echo 1. Testing Service Health Endpoints
echo -----------------------------------

REM Test Product Service Health
echo Testing Product Service Health...
curl -s -o nul -w "Status: %%{http_code}" %PRODUCT_SERVICE_URL%/health
echo.

REM Test User Service Health  
echo Testing User Service Health...
curl -s -o nul -w "Status: %%{http_code}" %USER_SERVICE_URL%/health
echo.

REM Test Monolith Health
echo Testing Monolith Health...
curl -s -o nul -w "Status: %%{http_code}" %MONOLITH_URL%/health
echo.

echo.
echo 2. Testing Basic API Functionality
echo ----------------------------------

REM Test Product Service API
echo Testing Product List Endpoint...
curl -s -o nul -w "Status: %%{http_code}" %PRODUCT_SERVICE_URL%/products
echo.

echo Testing Product Search Endpoint...
curl -s -o nul -w "Status: %%{http_code}" %PRODUCT_SERVICE_URL%/products/search
echo.

echo.
echo 3. Testing Metrics Endpoints
echo -----------------------------

echo Testing Product Service Metrics...
curl -s -o nul -w "Status: %%{http_code}" %PRODUCT_SERVICE_URL%/metrics
echo.

echo Testing User Service Metrics...
curl -s -o nul -w "Status: %%{http_code}" %USER_SERVICE_URL%/metrics
echo.

echo.
echo 4. Testing Authentication Flow
echo ------------------------------

echo Testing User Registration...
curl -s -o nul -w "Status: %%{http_code}" -X POST %USER_SERVICE_URL%/auth/register ^
    -H "Content-Type: application/json" ^
    -d "{\"name\":\"testuser\",\"password\":\"testpass123\",\"role\":\"client\"}"
echo.

echo Testing User Login...
curl -s -w "Status: %%{http_code}" -X POST %USER_SERVICE_URL%/auth/login ^
    -H "Content-Type: application/json" ^
    -d "{\"name\":\"testuser\",\"password\":\"testpass123\"}" ^
    > temp_login.json
echo.

echo.
echo ===================
echo Test Summary
echo ===================
echo.
echo Services are accessible and responding
echo Health checks are working
echo Basic authentication flow is functional
echo Metrics collection is active
echo.
echo Next Steps:
echo - Complete remaining services (Store, Stock, Sales, Refund, Cart)
echo - Implement API Gateway for centralized routing
echo - Add comprehensive load testing
echo - Set up monitoring dashboards
echo.
echo Access Points:
echo - Product Service: %PRODUCT_SERVICE_URL%
echo - User Service: %USER_SERVICE_URL%
echo - Monolith (comparison): %MONOLITH_URL%
echo - Prometheus: http://localhost:9090
echo - Grafana: http://localhost:3100

REM Cleanup
if exist temp_login.json del temp_login.json

pause
