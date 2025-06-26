@echo off
REM Kubernetes Port Forwarding Script - All Services
REM Sets up port forwarding for all LOG430 Lab 5 services in Kubernetes

echo ========================================
echo   LOG430 Lab 5 - Port Forwarding Setup
echo   Kubernetes Deployment
echo ========================================
echo.

echo Checking if Kubernetes is accessible...
kubectl cluster-info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Cannot connect to Kubernetes cluster!
    echo Please ensure Minikube is running:
    echo   minikube start
    echo.
    pause
    exit /b 1
)
echo [OK] Kubernetes cluster accessible
echo.

echo Setting up port forwarding for all services...
echo This will open multiple command windows for each service.
echo Close any window to stop that service's port forwarding.
echo.

echo Starting port forwarding...

echo [1/5] Frontend Client (http://localhost:5173)
start cmd /k "echo Frontend Client - http://localhost:5173 && kubectl port-forward service/client-service 5173:5173"
timeout /t 2 >nul

echo [2/5] Kong API Gateway (http://localhost:8000)
start cmd /k "echo Kong Gateway Proxy - http://localhost:8000 && kubectl port-forward service/kong-gateway-service 8000:8000"
timeout /t 2 >nul

echo [3/5] Kong Admin API (http://localhost:8001)
start cmd /k "echo Kong Admin API - http://localhost:8001 && kubectl port-forward service/kong-gateway-service 8001:8001"
timeout /t 2 >nul

echo [4/5] Prometheus (http://localhost:9090)
start cmd /k "echo Prometheus Monitoring - http://localhost:9090 && kubectl port-forward service/prometheus-service 9090:9090"
timeout /t 2 >nul

echo [5/5] Grafana (http://localhost:3100)
start cmd /k "echo Grafana Dashboards - http://localhost:3100 && kubectl port-forward service/grafana-service 3100:3100"
timeout /t 2 >nul

echo.
echo [OK] Port forwarding setup completed!
echo.
echo Access URLs:
echo ============
echo Frontend:        http://localhost:5173
echo API Gateway:     http://localhost:8000
echo Kong Admin:      http://localhost:8001
echo Prometheus:      http://localhost:9090
echo Grafana:         http://localhost:3100 (admin/admin)
echo.
echo NOTES:
echo - Each service runs in its own command window
echo - Close a window to stop port forwarding for that service
echo - API Gateway requires X-API-Key: frontend-app-key-12345
echo.
echo Press any key to return to menu...
pause >nul
