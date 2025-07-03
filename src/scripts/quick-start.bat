@echo off
REM Quick Start Script for LOG430 Lab 5
REM This script starts all microservices, Kong API Gateway, Redis for caching, and the web client

echo ========================================
echo   LOG430 Lab 5 - Quick Start Script
echo ========================================
echo.

echo This script will start:
echo [OK] PostgreSQL database
echo [OK] Redis cache service
echo [OK] All microservices (User, Catalog, Transaction)
echo [OK] Kong API Gateway
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
timeout /t 10 /nobreak >nul

echo Starting microservices...
docker-compose up -d user-service catalog-service transaction-service
echo Waiting for services to initialize...
timeout /t 10 /nobreak >nul

echo.
echo Step 2: Running database migrations and seeding...
docker-compose up db-migrate
echo Waiting for migrations to complete...
timeout /t 5 /nobreak >nul

echo Seeding database with sample data...
docker-compose --profile seed up db-seed
echo Waiting for seeding to complete...
timeout /t 5 /nobreak >nul

echo.
echo Step 3: Starting Kong API Gateway...
docker-compose up -d kong
echo Waiting for Kong to initialize...
timeout /t 5 /nobreak >nul

echo.
echo Step 4: Starting web client...
docker-compose --profile frontend up -d web-client

echo.
echo LOG430 Lab 5 system started! Access points:
echo - Web Client: http://localhost:5173
echo - API Gateway: http://localhost:8000
echo - API Admin: http://localhost:8001
echo.
echo Available services through API Gateway:
echo - User Service: http://localhost:8000/api/users
echo - Catalog Service: http://localhost:8000/api/products, http://localhost:8000/api/stores, http://localhost:8000/api/stock
echo - Transaction Service: http://localhost:8000/api/sales, http://localhost:8000/api/refunds
echo.
echo System startup completed! Press any key to exit...
pause
