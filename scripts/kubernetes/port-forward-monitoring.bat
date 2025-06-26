@echo off
REM Kubernetes Port Forwarding Script - Monitoring Only
REM Sets up port forwarding for monitoring services in Kubernetes

echo ========================================
echo   LOG430 Lab 5 - Monitoring Port Forwarding
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

echo Setting up port forwarding for monitoring services...
echo.

echo [1/2] Starting Prometheus port forwarding...
start cmd /k "echo Prometheus Monitoring - http://localhost:9090 && kubectl port-forward service/prometheus-service 9090:9090"
timeout /t 2 >nul

echo [2/2] Starting Grafana port forwarding...
start cmd /k "echo Grafana Dashboards - http://localhost:3100 (admin/admin) && kubectl port-forward service/grafana-service 3100:3100"
timeout /t 2 >nul

echo.
echo [OK] Monitoring port forwarding setup completed!
echo.
echo Access URLs:
echo ============
echo Prometheus:      http://localhost:9090
echo Grafana:         http://localhost:3100 (admin/admin)
echo.
echo NOTES:
echo - Each service runs in its own command window
echo - Close a window to stop port forwarding for that service
echo - Grafana may take a few minutes to fully load
echo.
echo Press any key to return...
pause >nul
