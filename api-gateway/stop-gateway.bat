cho off
REM Stop Load Balanced API Gateway and all microservices

echo ========================================
echo   Stopping Load Balanced API Gateway
echo ========================================
echo.

echo Stopping all services...
docker-compose -f docker-compose.loadbalanced.yml down
docker-compose -f docker-compose.gateway.yml down >nul 2>&1
echo.

echo Cleaning up containers...
docker-compose -f docker-compose.loadbalanced.yml rm -f
docker-compose -f docker-compose.gateway.yml rm -f >nul 2>&1
echo.

echo Cleaning up volumes (optional - preserves data)...
echo Run 'docker-compose -f docker-compose.loadbalanced.yml down -v' to remove volumes
echo.

echo ========================================
echo   All services stopped successfully!
echo ========================================
echo.
echo To start again, run: start-gateway.bat
echo.

pause
