@echo off
REM Restart Kong API Gateway to apply configuration changes

cd /d "%~dp0.."

echo Stopping Kong API Gateway...
docker-compose stop kong

echo Starting Kong API Gateway...
docker-compose up -d kong

echo Waiting for Kong to be ready...
timeout /t 10 /nobreak

echo Kong API Gateway restarted successfully!
echo.
echo Kong Admin API: http://localhost:8001
echo Kong Gateway: http://localhost:8000
echo.
echo Testing Kong status...
curl -s http://localhost:8001/status || echo Failed to connect to Kong Admin API

pause
