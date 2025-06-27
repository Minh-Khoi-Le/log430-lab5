@echo off
REM Script to seed the database with test data
REM This script can be run independently to seed the database

echo ========================================
echo   LOG430 Lab 5 - Database Seeding
echo ========================================
echo.

echo This script will seed the database with:
echo - 2 test users (client and admin)
echo - 3 sample stores
echo - 8 sample products
echo - Stock data for all products in all stores
echo - Sample sales and refund data
echo.


echo.
echo Seeding database...
cd /d "%~dp0.."
docker-compose --profile seed up db-seed

if errorlevel 1 (
    echo.
    echo ERROR: Database seeding failed!
    echo Make sure your database service is running:
    echo   docker-compose up postgres -d
    echo.
    echo Then try running the seed again.
    pause
    exit /b 1
) else (
    echo.
    echo SUCCESS: Database seeded successfully!
    echo.
    echo Test credentials:
    echo - Client: c / c
    echo - Admin: a / a
    echo.
    echo You can now use the application with these test accounts.
    echo.
    pause
)
