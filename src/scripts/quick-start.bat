@echo off
REM Quick Start Script for LOG430 Lab 5
REM This script starts all microservices, Kong API Gateway with CORS fixes, Redis for caching, and the web client

echo ========================================
echo   LOG430 Lab 5 - Quick Start Script
echo ========================================
echo.

echo This script will start:
echo [OK] PostgreSQL database
echo [OK] Redis cache service
echo [OK] All microservices (User, Catalog, Transaction)
echo [OK] Kong API Gateway (with CORS configuration)
echo [OK] Database seeding with demo data
echo [OK] Web client
echo.
echo Starting automatically in 3 seconds...
timeout /t 3 /nobreak >nul

echo.
echo Step 1: Starting database, Redis, and microservices...
cd /d "%~dp0.."
echo Stopping any existing containers...
docker-compose down --remove-orphans > nul 2>&1
echo Cleaning up networks and orphaned containers...
docker network prune -f > nul 2>&1

echo Starting infrastructure and services...
docker-compose up -d postgres redis
echo Waiting for database and cache to be ready...
timeout /t 5 /nobreak >nul

echo Starting microservices...
docker-compose up -d user-service catalog-service transaction-service
echo Waiting for services to initialize...
timeout /t 5 /nobreak >nul

echo.
echo Step 2: Running database migrations...
docker-compose up -d db-migrate
echo Waiting for migrations to complete...
timeout /t 5 /nobreak >nul

echo.
echo Step 3: Starting Kong API Gateway with CORS configuration...
docker-compose up -d kong
echo Waiting for Kong to initialize...
timeout /t 5 /nobreak >nul

echo Testing Kong connectivity...
curl -s http://localhost:8001/status > nul 2>&1
if %errorlevel% neq 0 (
    echo Warning: Kong might not be fully ready yet
    echo Waiting additional time...
    timeout /t 5 /nobreak >nul
)

echo.
echo Step 4: Seeding database with demo data...
echo This includes: 2 users, 3 stores, 25+ products, inventory, and sample transactions
docker-compose run --rm db-seed
echo Database seeding completed!

echo.
echo Step 5: Starting web client...
docker-compose --profile frontend up -d web-client

echo.
echo ========================================
echo   LOG430 Lab 5 - System Ready!
echo ========================================
echo.
echo Access Points:
echo - Web Client: http://localhost:5173
echo - API Gateway: http://localhost:8000  
echo - Kong Admin: http://localhost:8001
echo.
echo Demo Login Credentials:
echo - Admin: admin / admin123
echo - Client: client / client123
echo.
echo Available API Endpoints (through Kong):
echo - Stores (Public): http://localhost:8000/api/stores
echo - Products: http://localhost:8000/api/products  
echo - Users: http://localhost:8000/api/users
echo - Auth: http://localhost:8000/api/auth/login
echo - Sales: http://localhost:8000/api/sales
echo - Refunds: http://localhost:8000/api/refunds
echo - Stock: http://localhost:8000/api/stock
echo.
echo Note: Kong is configured with CORS support for frontend development
echo System startup completed! Press any key to exit...
pause
