@echo off
REM Simplified Kong Gateway Startup Script for LOG430 Lab 5

echo ========================================
echo   LOG430 Lab 5 - Kong API Gateway (Simple)
echo   Load Balancing for all services
echo ========================================
echo.

echo Checking if Docker is running...
docker info > nul 2>&1
if %errorlevel% neq 0 (
  echo  Docker is not running! Please start Docker Desktop first.
  exit /b 1
) else (
  echo  Docker is running
)

echo.
echo Checking if services are running...
docker ps | findstr "product-service" > nul
if %errorlevel% neq 0 (
  echo  Warning: Microservices don't appear to be running.
  echo  Please run 'docker-compose up -d' first to start the services!
  echo  Continuing anyway...
)

echo.
echo Stopping any existing Kong containers...
docker stop kong-gateway > nul 2>&1
docker rm kong-gateway > nul 2>&1

echo.
echo Starting Kong API Gateway...
cd /d "%~dp0..\.."

echo Creating Docker network for Kong...
docker network create kong-network > nul 2>&1
echo Connecting Kong to microservices network...
docker network connect log430-lab5_default kong-network > nul 2>&1

echo Running Kong container...
docker run -d --name kong-gateway ^
  --network kong-network ^
  -v "%CD%\api-gateway\kong.yml:/usr/local/kong/declarative/kong.yml" ^
  -e "KONG_DATABASE=off" ^
  -e "KONG_DECLARATIVE_CONFIG=/usr/local/kong/declarative/kong.yml" ^
  -e "KONG_PROXY_ACCESS_LOG=/dev/stdout" ^
  -e "KONG_ADMIN_ACCESS_LOG=/dev/stdout" ^
  -e "KONG_PROXY_ERROR_LOG=/dev/stderr" ^
  -e "KONG_ADMIN_ERROR_LOG=/dev/stderr" ^
  -e "KONG_ADMIN_LISTEN=0.0.0.0:8001" ^
  -e "KONG_PROXY_LISTEN=0.0.0.0:8000" ^
  -p 8000:8000 ^
  -p 8001:8001 ^
  kong:latest

docker network connect log430-lab5_default kong-gateway

echo.
echo Waiting for Kong to initialize...
timeout /t 5 /nobreak > nul

echo.
echo Kong API Gateway is running! Access points:
echo - API Gateway: http://localhost:8000
echo - Admin API: http://localhost:8001
echo.
echo You can now use these APIs:
echo - Products API: http://localhost:8000/products
echo - Users API: http://localhost:8000/users
echo - Auth API: http://localhost:8000/auth
echo - Stores API: http://localhost:8000/stores
echo - Stock API: http://localhost:8000/stock
echo - Sales API: http://localhost:8000/sales
echo - Cart API: http://localhost:8000/cart
echo.
echo Load balancing is configured for all services!
echo. 