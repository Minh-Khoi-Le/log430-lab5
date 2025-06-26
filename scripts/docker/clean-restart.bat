@echo off
REM Clean Restart Script - Removes all containers and volumes for fresh start

echo ========================================
echo   LOG430 Lab 5 - Clean Restart
echo ========================================
echo.

echo WARNING: This will remove all containers and volumes!
echo This will delete all data in the databases!
echo.
set /p confirm=Are you sure you want to proceed? (y/N): 
if /i "%confirm%" neq "y" goto :cancel

REM Navigate to the API Gateway directory
cd /d "%~dp0..\..\api-gateway"

echo.
echo Stopping and removing all containers and volumes...
docker-compose -f docker-compose.loadbalanced.yml down -v
docker-compose -f docker-compose.gateway.yml down -v >nul 2>&1
echo.

echo Cleaning up Docker system...
docker system prune -f
echo.

echo Starting fresh installation...
call "%~dp0start-gateway.bat"
goto :end

:cancel
echo.
echo Clean restart cancelled.
echo.

:end
REM Return to scripts directory
cd /d "%~dp0"
pause
