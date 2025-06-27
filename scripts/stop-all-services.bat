@echo off
REM Master script to stop all services for LOG430 Lab 5
REM This script stops Kong API Gateway, all microservices, and cleans up resources

echo ========================================
echo   LOG430 Lab 5 - Stop All Services
echo ========================================
echo.

echo Stopping all services...
call "%~dp0docker\stop-all.bat"

echo.
echo All services have been stopped. System is clean.
echo.
pause 