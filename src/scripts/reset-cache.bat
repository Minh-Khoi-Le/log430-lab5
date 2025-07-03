@echo off
REM Redis Reset Script for LOG430 Lab 5
REM This script resets the Redis cache by restarting the Redis service

echo ========================================
echo   LOG430 Lab 5 - Reset Redis Cache
echo ========================================
echo.

echo This script will:
echo [OK] Stop the Redis container
echo [OK] Remove Redis volume data
echo [OK] Start a fresh Redis container
echo.

cd /d "%~dp0.."

echo Stopping Redis cache...
docker-compose stop redis
docker-compose rm -f redis

echo Removing Redis volume...
docker volume rm src_redis_data > nul 2>&1

echo Starting fresh Redis cache...
docker-compose up -d redis
if errorlevel 1 (
    echo ERROR: Redis failed to start. Please check Docker and try again.
    echo.
    echo Possible issues:
    echo - Port 6379 is already in use
    echo - Docker service is not running
    echo - Insufficient system resources
) else (
    echo.
    echo Redis cache reset successfully!
    echo All cached data has been cleared and Redis is running fresh.
    echo.
    echo Redis container details:
    docker-compose ps redis
)

echo.
echo Press any key to exit...
pause
