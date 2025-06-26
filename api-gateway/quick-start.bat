@echo off
REM Quick Start Script for Load Balanced API Gateway
REM This is the main entry point for starting the entire system

echo ========================================
echo   LOG430 Lab 5 - Quick Start
echo   Load Balanced Microservices Gateway
echo ========================================
echo.

echo What would you like to do?
echo.
echo 1. Start Load Balanced Gateway ^(Default^)
echo 2. Stop Gateway
echo 3. Test Gateway and Load Balancing
echo 4. View Gateway Logs
echo 5. View Service Status
echo 6. Clean Restart ^(Remove all containers and volumes^)
echo 7. Exit
echo.

set /p choice=Please select an option (1-7): 

if "%choice%"=="1" goto start_gateway
if "%choice%"=="2" goto stop_gateway
if "%choice%"=="3" goto test_gateway
if "%choice%"=="4" goto view_logs
if "%choice%"=="5" goto service_status
if "%choice%"=="6" goto clean_restart
if "%choice%"=="7" goto exit_script
echo Invalid choice. Please try again.
goto :eof

:start_gateway
echo.
echo Starting Load Balanced API Gateway...
call start-gateway.bat
goto :eof

:stop_gateway
echo.
echo Stopping API Gateway...
call stop-gateway.bat
goto :eof

:test_gateway
echo.
echo Testing API Gateway and Load Balancing...
call test-gateway.bat
echo.
echo Additional load balancing tests...
call test-loadbalancing.bat
goto :eof

:view_logs
echo.
echo Viewing Gateway logs ^(Press Ctrl+C to exit^)...
docker-compose -f docker-compose.loadbalanced.yml logs -f kong
goto :eof

:service_status
echo.
echo Current Service Status:
echo ========================
docker-compose -f docker-compose.loadbalanced.yml ps
echo.
echo Kong Admin API Status:
curl -s http://localhost:8001/status 2>nul && echo OK || echo NOT RUNNING
echo.
echo Load Balanced Services Status:
echo - Product Service Instances: 2
echo - Stock Service Instances: 2  
echo - Cart Service Instances: 2
echo.
pause
goto :eof

:clean_restart
echo.
echo WARNING: This will remove all containers and volumes!
echo This will delete all data in the databases!
set /p confirm=Are you sure? (y/N): 
if /i "%confirm%" neq "y" goto :eof

echo Stopping and removing all containers and volumes...
docker-compose -f docker-compose.loadbalanced.yml down -v
docker-compose -f docker-compose.gateway.yml down -v >nul 2>&1
docker system prune -f
echo.
echo Clean restart complete. Starting fresh...
call start-gateway.bat
goto :eof

:exit_script
echo.
echo Thank you for using LOG430 Lab 5 Gateway!
echo.
exit /b 0
