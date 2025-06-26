@echo off
REM Kubernetes System Status Script
REM Comprehensive health check for LOG430 Lab 5 Kubernetes deployment

echo ========================================
echo   LOG430 Lab 5 - Kubernetes System Status
echo ========================================
echo.

REM Navigate to project root
cd /d "%~dp0..\.."

echo Checking Kubernetes cluster connectivity...
kubectl cluster-info >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] Cannot connect to Kubernetes cluster!
    echo Please ensure Minikube is running:
    echo   minikube start
    echo.
    pause
    exit /b 1
)
echo [OK] Kubernetes cluster accessible
echo.

echo Cluster Information
echo ===================
kubectl cluster-info
echo.

echo Node Status
echo ===========
kubectl get nodes
echo.

echo Namespace Overview
echo ==================
kubectl get namespaces
echo.

echo All Deployments Status
echo ======================
kubectl get deployments
echo.

echo All Services Status
echo ===================
kubectl get services
echo.

echo All Pods Status
echo ===============
kubectl get pods -o wide
echo.

echo Ingress Status
echo ==============
kubectl get ingress
echo.

echo Persistent Volumes
echo ==================
kubectl get pv,pvc
echo.

echo ConfigMaps and Secrets
echo ======================
kubectl get configmaps,secrets
echo.

echo Checking Pod Health Details...
echo =============================

echo Infrastructure Services:
echo -------------------------
kubectl get pods -l app=postgres -o custom-columns="NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount"
kubectl get pods -l app=redis -o custom-columns="NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount"

echo.
echo Load Balanced Microservices:
echo ----------------------------
kubectl get pods -l app=product-service -o custom-columns="NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount"
kubectl get pods -l app=stock-service -o custom-columns="NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount"
kubectl get pods -l app=cart-service -o custom-columns="NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount"

echo.
echo Single Instance Services:
echo -------------------------
kubectl get pods -l app=user-service -o custom-columns="NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount"
kubectl get pods -l app=store-service -o custom-columns="NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount"
kubectl get pods -l app=sales-service -o custom-columns="NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount"
kubectl get pods -l app=refund-service -o custom-columns="NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount"

echo.
echo API Gateway and Frontend:
echo -------------------------
kubectl get pods -l app=kong-gateway -o custom-columns="NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount"
kubectl get pods -l app=client -o custom-columns="NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount"

echo.
echo Monitoring Services:
echo --------------------
kubectl get pods -l app=prometheus -o custom-columns="NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount"
kubectl get pods -l app=grafana -o custom-columns="NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount"

echo.
echo Resource Usage
echo ==============
kubectl top nodes 2>nul || echo "Metrics server not available"
kubectl top pods 2>nul || echo "Pod metrics not available"

echo.
echo Service Endpoints
echo =================
echo Getting external access information...

echo.
echo Minikube Service URLs:
echo =====================
echo Frontend:
minikube service client-service --url 2>nul || echo "Service not accessible"
echo.
echo API Gateway:
minikube service kong-gateway-service --url 2>nul || echo "Service not accessible"
echo.
echo Prometheus:
minikube service prometheus-service --url 2>nul || echo "Service not accessible"
echo.
echo Grafana:
minikube service grafana-service --url 2>nul || echo "Service not accessible"

echo.
echo Recent Events
echo =============
kubectl get events --sort-by=.metadata.creationTimestamp | tail -10

echo.
echo [INFO] System status check completed
echo.
echo NEXT STEPS:
echo ===========
echo 1. Use 'scripts\kubernetes\port-forward-all.bat' for local access
echo 2. Run 'scripts\kubernetes\test-k8s.bat' to test functionality
echo 3. Check 'kubectl logs <pod-name>' for specific pod issues
echo.
pause
