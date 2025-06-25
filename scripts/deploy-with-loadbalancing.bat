@echo off
echo ============================================
echo Deploying LOG430 with Load Balancing
echo ============================================

echo Checking if Minikube is running...
minikube status
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Minikube is not running. Please start Minikube first with:
    echo minikube start --driver=docker
    exit /b 1
)

echo Setting up Minikube Docker environment...
FOR /F "tokens=*" %%i IN ('minikube -p minikube docker-env') DO %%i

echo Building Docker images...
echo [1/2] Building server image...
docker build -t log430-server:latest ./server
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to build server image. See error message above.
    exit /b 1
)

echo [2/2] Building client image...
docker build -t log430-client:latest ./client
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to build client image. See error message above.
    exit /b 1
)

echo Deploying infrastructure services...
echo [1/3] Deploying PostgreSQL...
kubectl apply -f k8s/postgres.yaml
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy PostgreSQL. See error message above.
    exit /b 1
)

echo [2/3] Deploying Redis...
kubectl apply -f k8s/redis.yaml
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy Redis. See error message above.
    exit /b 1
)

echo [3/3] Deploying monitoring services...
kubectl apply -f k8s/prometheus.yaml
kubectl apply -f k8s/grafana.yaml

echo Waiting for database services to be ready...
echo This may take a minute...
kubectl wait --for=condition=ready pod -l app=postgres --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis --timeout=60s

echo Deploying application services...
echo [1/3] Deploying server...
kubectl apply -f k8s/fixed-server.yaml
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy server. See error message above.
    exit /b 1
)

echo [2/3] Deploying client...
kubectl apply -f k8s/client.yaml
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy client. See error message above.
    exit /b 1
)

echo [3/3] Deploying ingress (load balancer)...
kubectl apply -f k8s/ingress.yaml
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy ingress. See error message above.
    exit /b 1
)

echo Enabling ingress addon in Minikube if not already enabled...
minikube addons enable ingress

echo ============================================
echo Deployment complete!
echo ============================================

echo Checking pod status...
kubectl get pods

echo For port forwarding, run: scripts\port-forward-all.bat
echo For monitoring, run: scripts\port-forward-monitoring.bat

echo The load balanced application will be available at:
echo - Main App: http://localhost:8080 (after port forwarding)
echo - API: http://localhost:8080/api
echo ============================================ 