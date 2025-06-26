@echo off
REM Docker Quick Start Script for LOG430 Lab 5
REM Interactive menu for Docker Compose operations

:menu
cls
echo ========================================
echo   LOG430 Lab 5 - Docker Quick Start
echo   Load Balanced Microservices System
echo ========================================
echo.
echo Main Operations:
echo   1. Start Complete System (Gateway + Frontend)
echo   2. Start API Gateway Only
echo   3. Start Frontend Only
echo   4. Stop Everything
echo.
echo Testing & Monitoring:
echo   5. Test Gateway & Load Balancing
echo   6. System Status Check
echo   7. View Logs
echo   8. Load Testing
echo.
echo Maintenance:
echo   9. Clean Restart (Remove all data)
echo  10. Update Docker Images
echo.
echo Documentation:
echo  11. View System Architecture
echo  12. API Documentation
echo  13. Troubleshooting Guide
echo.
echo  0. Exit
echo.
echo ========================================

set /p choice=Please select an option (0-13): 

if "%choice%"=="1" goto start_complete
if "%choice%"=="2" goto start_gateway
if "%choice%"=="3" goto start_frontend
if "%choice%"=="4" goto stop_everything
if "%choice%"=="5" goto test_gateway
if "%choice%"=="6" goto system_status
if "%choice%"=="7" goto view_logs
if "%choice%"=="8" goto load_test
if "%choice%"=="9" goto clean_restart
if "%choice%"=="10" goto update_images
if "%choice%"=="11" goto view_architecture
if "%choice%"=="12" goto api_docs
if "%choice%"=="13" goto troubleshooting
if "%choice%"=="0" goto exit_script

echo Invalid choice. Please try again.
timeout /t 2 /nobreak >nul
goto menu

:start_complete
cls
echo ========================================
echo   Starting Complete Docker System
echo ========================================
echo.
echo This will start:
echo [OK] Load Balanced API Gateway
echo [OK] All Microservices (with load balancing)
echo [OK] Database and Cache systems
echo [OK] Monitoring (Prometheus + Grafana)
echo [OK] Frontend Client
echo.
pause
call start-gateway.bat
timeout /t 10 /nobreak >nul
call start-frontend.bat
echo.
echo System started! Access points:
echo - Frontend: http://localhost:3000
echo - API Gateway: http://localhost:8000
echo - Grafana: http://localhost:3001
echo.
pause
goto menu

:start_gateway
cls
echo ========================================
echo   Starting API Gateway Only
echo ========================================
call start-gateway.bat
pause
goto menu

:start_frontend
cls
echo ========================================
echo   Starting Frontend Only
echo ========================================
call start-frontend.bat
pause
goto menu

:stop_everything
cls
echo ========================================
echo   Stopping Everything
echo ========================================
call stop-gateway.bat
echo.
echo Stopping frontend...
cd /d "%~dp0..\..\client"
docker-compose down 2>nul
echo Frontend stopped.
echo.
echo All systems stopped.
pause
goto menu

:test_gateway
cls
echo ========================================
echo   Testing Gateway & Load Balancing
echo ========================================
call test-gateway.bat
pause
goto menu

:system_status
cls
echo ========================================
echo   System Status Check
echo ========================================
call system-status.bat
pause
goto menu

:view_logs
cls
echo ========================================
echo   View System Logs
echo ========================================
call view-logs.bat
pause
goto menu

:load_test
cls
echo ========================================
echo   Load Testing
echo ========================================
call load-test.bat
pause
goto menu

:clean_restart
cls
echo ========================================
echo   Clean Restart
echo ========================================
echo WARNING: This will remove all data!
set /p confirm=Are you sure? (y/N): 
if /i not "%confirm%"=="y" goto menu
call clean-restart.bat
pause
goto menu

:update_images
cls
echo ========================================
echo   Update Docker Images
echo ========================================
echo Pulling latest images...
docker-compose -f "%~dp0..\..\api-gateway\docker-compose.loadbalanced.yml" pull
docker-compose -f "%~dp0..\..\services\docker-compose.microservices.yml" pull
docker-compose -f "%~dp0..\..\client\docker-compose.yml" pull 2>nul || echo Frontend image updated locally
echo.
echo Images updated!
pause
goto menu

:view_architecture
cls
echo ========================================
echo   System Architecture
echo ========================================
echo Opening architecture documentation...
start "" "%~dp0..\..\docs\Rapport d'architecture.md"
pause
goto menu

:api_docs
cls
echo ========================================
echo   API Documentation
echo ========================================
echo API Gateway endpoints:
echo - Health: GET http://localhost:8000/health
echo - Products: GET http://localhost:8000/products
echo - Cart: GET/POST http://localhost:8000/cart
echo - Sales: POST http://localhost:8000/sales
echo - Refunds: POST http://localhost:8000/refunds
echo - Stock: GET http://localhost:8000/stock
echo - Users: GET/POST http://localhost:8000/users
echo - Stores: GET http://localhost:8000/stores
echo.
echo For detailed API documentation, check the service README files.
pause
goto menu

:troubleshooting
cls
echo ========================================
echo   Troubleshooting Guide
echo ========================================
echo Common issues and solutions:
echo.
echo 1. Port already in use:
echo    - Run "docker ps" to check running containers
echo    - Stop conflicting services or change ports
echo.
echo 2. Services not starting:
echo    - Check "docker logs [container-name]"
echo    - Ensure Docker Desktop is running
echo    - Try clean restart (option 9)
echo.
echo 3. Database connection issues:
echo    - Wait 30 seconds after starting for initialization
echo    - Check PostgreSQL and Redis containers are running
echo.
echo 4. Load balancing not working:
echo    - Verify multiple service instances are running
echo    - Check Kong Gateway configuration
echo.
echo For more help, check README.md files in each service directory.
pause
goto menu

:exit_script
cls
echo Thank you for using the Docker Quick Start script!
timeout /t 2 /nobreak >nul
exit /b 0
