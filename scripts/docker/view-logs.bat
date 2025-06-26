@echo off
REM View Logs Script - Shows logs from various services

echo ========================================
echo   LOG430 Lab 5 - View Logs
echo ========================================
echo.

echo What logs would you like to view?
echo.
echo 1. Kong Gateway logs
echo 2. All services logs
echo 3. Product Service logs (Load Balanced)
echo 4. Stock Service logs (Load Balanced)
echo 5. Cart Service logs (Load Balanced)
echo 6. Database logs
echo 7. Redis logs
echo 8. Prometheus logs
echo 9. Live logs (follow mode)
echo 0. Exit
echo.

set /p choice=Please select an option (0-9): 

REM Navigate to the API Gateway directory
cd /d "%~dp0..\..\api-gateway"

if "%choice%"=="1" goto kong_logs
if "%choice%"=="2" goto all_logs
if "%choice%"=="3" goto product_logs
if "%choice%"=="4" goto stock_logs
if "%choice%"=="5" goto cart_logs
if "%choice%"=="6" goto db_logs
if "%choice%"=="7" goto redis_logs
if "%choice%"=="8" goto prometheus_logs
if "%choice%"=="9" goto live_logs
if "%choice%"=="0" goto exit_script
echo Invalid choice. Please try again.
goto :end

:kong_logs
echo.
echo Kong Gateway Logs:
echo ==================
docker-compose -f docker-compose.loadbalanced.yml logs kong
goto :end

:all_logs
echo.
echo All Services Logs:
echo ==================
docker-compose -f docker-compose.loadbalanced.yml logs
goto :end

:product_logs
echo.
echo Product Service Logs (Both Instances):
echo ======================================
docker-compose -f docker-compose.loadbalanced.yml logs product-service-1 product-service-2
goto :end

:stock_logs
echo.
echo Stock Service Logs (Both Instances):
echo ====================================
docker-compose -f docker-compose.loadbalanced.yml logs stock-service-1 stock-service-2
goto :end

:cart_logs
echo.
echo Cart Service Logs (Both Instances):
echo ===================================
docker-compose -f docker-compose.loadbalanced.yml logs cart-service-1 cart-service-2
goto :end

:db_logs
echo.
echo Database Logs:
echo ==============
docker-compose -f docker-compose.loadbalanced.yml logs postgres
goto :end

:redis_logs
echo.
echo Redis Cache Logs:
echo =================
docker-compose -f docker-compose.loadbalanced.yml logs redis
goto :end

:prometheus_logs
echo.
echo Prometheus Monitoring Logs:
echo ============================
docker-compose -f docker-compose.loadbalanced.yml logs prometheus
goto :end

:live_logs
echo.
echo Live Logs (Press Ctrl+C to exit):
echo ==================================
docker-compose -f docker-compose.loadbalanced.yml logs -f
goto :end

:exit_script
echo Exiting...
goto :end

:end
REM Return to scripts directory
cd /d "%~dp0"
pause
