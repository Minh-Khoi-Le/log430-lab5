@echo off
cd ..
echo Starting monitoring stack...

echo.
echo Starting Prometheus and Grafana...
docker-compose -f docker-compose.yml up -d prometheus grafana node-exporter postgres-exporter redis-exporter

echo.
echo Waiting for services to start...
timeout /t 10 /nobreak > nul

echo.
echo Starting application services...
docker-compose up -d

echo.
echo Monitoring stack started successfully!
echo.
echo Access points:
echo - Prometheus: http://localhost:9090
echo - Grafana: http://localhost:3004 (admin/admin)
echo - Application: http://localhost:8000
echo.
echo Services:
echo - User Service: http://localhost:3001/metrics
echo - Catalog Service: http://localhost:3002/metrics
echo - Transaction Service: http://localhost:3003/metrics
echo.
echo Press any key to continue...
pause > nul
