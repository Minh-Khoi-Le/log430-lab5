@echo off
REM Master script to start all services with Kong API Gateway for LOG430 Lab 5
REM This script starts all microservices, Kong API Gateway with load balancing, and the frontend

echo ========================================
echo   LOG430 Lab 5 - Start with Kong API Gateway
echo ========================================
echo.

echo This script will start:
echo [OK] All microservices
echo [OK] Database seeding with mock data
echo [OK] Kong API Gateway with load balancing
echo [OK] Frontend client
echo.
echo Starting automatically in 3 seconds...
timeout /t 3 /nobreak >nul

echo.
echo Step 1: Starting microservices...
cd /d "%~dp0.."
echo Stopping any existing containers...
docker stop kong-gateway > nul 2>&1
docker rm kong-gateway > nul 2>&1
echo Cleaning up networks and orphaned containers...
docker-compose down --remove-orphans > nul 2>&1
docker network prune -f > nul 2>&1
echo Starting services...
docker-compose up --build -d
echo Waiting for services to initialize...
timeout /t 5 /nobreak >nul

echo.
echo Step 2: Setting up database and seeding data...
echo Waiting for database to be ready...
timeout /t 5 /nobreak >nul

echo Running database migrations...
docker-compose up -d db-migrate
echo Waiting for migration to complete...
timeout /t 5 /nobreak >nul
docker-compose logs db-migrate
if errorlevel 1 (
    echo WARNING: Database migration had issues, continuing...
)

echo Seeding database with mock data...
docker-compose --profile seed up --build -d db-seed
echo Waiting for seeding to complete...
timeout /t 5 /nobreak >nul
docker-compose logs db-seed
if errorlevel 1 (
    echo WARNING: Database seeding failed
    echo The system will continue but you may need to seed manually
    echo.
    echo To seed manually, run:
    echo   docker-compose --profile seed up --build db-seed
    echo.
    echo Or use the dedicated seeding script:
    echo   "%~dp0seed-database.bat"
) else (
    echo Database seeded successfully!
    echo - 2 test users created (1 client, 1 admin)
    echo - Sample products, stores, and stock data added
    echo - Test credentials: Client (c/c), Admin (a/a)
)


echo.
echo Step 3: Starting Kong API Gateway...
cd /d "%~dp0.."
docker-compose --profile kong up -d kong-gateway

echo.
echo Step 4: Starting frontend...
call "%~dp0docker\start-frontend.bat"

echo.
echo LOG430 Lab 5 system started! Access points:
echo - Frontend: http://localhost:5173 (or the port shown in the frontend window)
echo - API Gateway: http://localhost:8000
echo - API Admin: http://localhost:8001
echo.
echo Available services through API Gateway:
echo - Products: http://localhost:8000/products
echo - Users: http://localhost:8000/users
echo - Auth: http://localhost:8000/auth
echo - Stores: http://localhost:8000/stores
echo - Stock: http://localhost:8000/stock
echo - Sales: http://localhost:8000/sales
echo - Cart: http://localhost:8000/cart
echo.
echo Database Test Users (seeded automatically):
echo - Client: c / c
echo - Admin: a / a
echo.
echo Database Management Scripts:
echo - Re-seed database: "%~dp0seed-database.bat"
echo.
echo System startup completed! Press any key to exit...
pause