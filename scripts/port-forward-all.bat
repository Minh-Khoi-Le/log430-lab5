@echo off
echo Starting port forwarding for all services...

:: Open new command prompt window for ingress controller (main application access)
start cmd /k "echo Forwarding ingress controller to http://localhost:8080 && kubectl port-forward svc/ingress-nginx-controller 8080:80 -n ingress-nginx"

:: Wait a moment to avoid overlapping windows
timeout /t 1 >nul

:: Open new command prompt window for server API (direct access if needed)
start cmd /k "echo Forwarding server API to http://localhost:3000 && kubectl port-forward service/server 3000:3000"

:: Wait a moment to avoid overlapping windows
timeout /t 1 >nul

:: Open new command prompt window for prometheus
start cmd /k "echo Forwarding Prometheus to http://localhost:9090 && kubectl port-forward service/prometheus 9090:9090"

:: Wait a moment to avoid overlapping windows
timeout /t 1 >nul

:: Open new command prompt window for grafana
start cmd /k "echo Forwarding Grafana to http://localhost:3001 && kubectl port-forward service/grafana 3001:3000"

echo.
echo Port forwarding started in separate windows.
echo.
echo You can access your services at:
echo   - Main Application: http://localhost:8080
echo   - Server API (direct): http://localhost:3000
echo   - Prometheus: http://localhost:9090
echo   - Grafana: http://localhost:3001 (login: admin/admin)
echo.
echo To stop port forwarding, close the respective command prompt windows. 