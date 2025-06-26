@echo off
REM Kubernetes Deployment Script for LOG430 Lab 5 Microservices
REM Deploys the complete load-balanced microservices architecture to Kubernetes

echo ========================================
echo   LOG430 Lab 5 - Kubernetes Deployment
echo   Load Balanced Microservices Architecture
echo ========================================
echo.

REM Navigate to project root
cd /d "%~dp0.."

echo Checking Minikube status...
minikube status >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Minikube is not running!
    echo Please start Minikube first with:
    echo   minikube start --driver=docker
    echo.
    pause
    exit /b 1
)
echo [OK] Minikube is running
echo.

echo Setting up Docker environment for Minikube...
FOR /F "tokens=*" %%i IN ('minikube docker-env') DO %%i
echo [OK] Docker environment configured for Minikube
echo.

echo Building Docker images in Minikube environment...
echo Building Kong Gateway...
cd api-gateway
docker build -t kong-gateway:latest .
cd ..

echo Building microservices...
cd services\product-service
docker build -t product-service:latest .
cd ..\stock-service
docker build -t stock-service:latest .
cd ..\cart-service
docker build -t cart-service:latest .
cd ..\user-service
docker build -t user-service:latest .
cd ..\store-service
docker build -t store-service:latest .
cd ..\sales-service
docker build -t sales-service:latest .
cd ..\refund-service
docker build -t refund-service:latest .
cd ..\..

echo Building frontend client...
cd client
docker build -t client:latest .
cd ..

echo [OK] All Docker images built
echo.

echo Deploying to Kubernetes...
echo ==========================

echo [1/8] Deploying infrastructure services...
kubectl apply -f k8s\postgres.yaml
kubectl apply -f k8s\redis.yaml

echo [2/8] Deploying load-balanced microservices...
kubectl apply -f k8s\product-service.yaml
kubectl apply -f k8s\stock-service.yaml
kubectl apply -f k8s\cart-service.yaml

echo [3/8] Deploying single-instance microservices...
kubectl apply -f k8s\single-services.yaml

echo [4/8] Deploying Kong API Gateway...
kubectl apply -f k8s\kong-gateway.yaml

echo [5/8] Deploying frontend client...
kubectl apply -f k8s\client.yaml

echo [6/8] Deploying monitoring stack...
kubectl apply -f k8s\monitoring.yaml

echo [7/8] Setting up ingress...
kubectl apply -f k8s\ingress.yaml

echo [8/8] Waiting for deployments to be ready...
echo This may take a few minutes...
kubectl wait --for=condition=available --timeout=300s deployment/postgres
kubectl wait --for=condition=available --timeout=300s deployment/redis
kubectl wait --for=condition=available --timeout=300s deployment/kong-gateway
kubectl wait --for=condition=available --timeout=300s deployment/product-service-1
kubectl wait --for=condition=available --timeout=300s deployment/product-service-2
kubectl wait --for=condition=available --timeout=300s deployment/stock-service-1
kubectl wait --for=condition=available --timeout=300s deployment/stock-service-2
kubectl wait --for=condition=available --timeout=300s deployment/cart-service-1
kubectl wait --for=condition=available --timeout=300s deployment/cart-service-2
kubectl wait --for=condition=available --timeout=300s deployment/user-service
kubectl wait --for=condition=available --timeout=300s deployment/store-service
kubectl wait --for=condition=available --timeout=300s deployment/sales-service
kubectl wait --for=condition=available --timeout=300s deployment/refund-service
kubectl wait --for=condition=available --timeout=300s deployment/client
kubectl wait --for=condition=available --timeout=300s deployment/prometheus
kubectl wait --for=condition=available --timeout=300s deployment/grafana

echo.
echo [OK] Deployment completed successfully!
echo.

echo Getting service information...
echo =============================
kubectl get services

echo.
echo Access Information:
echo ==================
echo Frontend: 
minikube service client-service --url
echo.
echo API Gateway: 
minikube service kong-gateway-service --url
echo.
echo Monitoring:
echo Prometheus: 
minikube service prometheus-service --url
echo Grafana: 
minikube service grafana-service --url
echo   (login: admin/admin)
echo.

echo Port forwarding setup (run in separate terminals):
echo ==================================================
echo kubectl port-forward service/client-service 5173:5173
echo kubectl port-forward service/kong-gateway-service 8000:8000
echo kubectl port-forward service/kong-gateway-service 8001:8001
echo kubectl port-forward service/prometheus-service 9090:9090
echo kubectl port-forward service/grafana-service 3100:3100
echo.

echo System Status:
echo ==============
kubectl get pods

echo.
echo [OK] Kubernetes deployment ready!
echo Use the URLs above to access the services.
echo.
pause
