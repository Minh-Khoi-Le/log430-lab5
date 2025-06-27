@echo off
REM Kong Gateway Startup Script for LOG430 Lab 5
REM This script starts Kong API Gateway connected to existing services

echo ========================================
echo   LOG430 Lab 5 - Kong API Gateway
echo   Works with existing services
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
docker-compose -f "%~dp0..\..\api-gateway\docker-compose.kong.yml" down > nul 2>&1

echo.
echo Building and starting Kong API Gateway...
cd /d "%~dp0..\.."
docker-compose -f api-gateway/docker-compose.kong.yml up -d --build

echo.
echo Waiting for Kong to initialize...
timeout /t 5 /nobreak > nul

echo.
echo Kong API Gateway is running! Access points:
echo - API Gateway: http://localhost:8000
echo - API Admin: http://localhost:8001
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
echo Load balancing is enabled for:
echo - Product Service
echo - Stock Service
echo - Cart Service
echo. 