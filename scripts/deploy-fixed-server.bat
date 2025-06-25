@echo off
echo ============================================
echo Deploying LOG430 with Fixed Server (No Load Balancing)
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
echo [1/4] Deploying server...
kubectl apply -f k8s/fixed-server.yaml
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy server. See error message above.
    exit /b 1
)

echo [2/4] Creating temporary client definition files...
(
echo apiVersion: apps/v1
echo kind: Deployment
echo metadata:
echo   name: client1
echo spec:
echo   replicas: 1
echo   selector:
echo     matchLabels:
echo       app: client1
echo   template:
echo     metadata:
echo       labels:
echo         app: client1
echo     spec:
echo       containers:
echo       - name: client
echo         image: log430-client:latest
echo         imagePullPolicy: Never
echo         ports:
echo         - containerPort: 80
echo ---
echo apiVersion: v1
echo kind: Service
echo metadata:
echo   name: client1
echo spec:
echo   selector:
echo     app: client1
echo   ports:
echo   - port: 80
echo     targetPort: 80
echo   type: ClusterIP
) > k8s/temp-client1.yaml

(
echo apiVersion: apps/v1
echo kind: Deployment
echo metadata:
echo   name: client2
echo spec:
echo   replicas: 1
echo   selector:
echo     matchLabels:
echo       app: client2
echo   template:
echo     metadata:
echo       labels:
echo         app: client2
echo     spec:
echo       containers:
echo       - name: client
echo         image: log430-client:latest
echo         imagePullPolicy: Never
echo         ports:
echo         - containerPort: 80
echo ---
echo apiVersion: v1
echo kind: Service
echo metadata:
echo   name: client2
echo spec:
echo   selector:
echo     app: client2
echo   ports:
echo   - port: 80
echo     targetPort: 80
echo   type: ClusterIP
) > k8s/temp-client2.yaml

(
echo apiVersion: apps/v1
echo kind: Deployment
echo metadata:
echo   name: client3
echo spec:
echo   replicas: 1
echo   selector:
echo     matchLabels:
echo       app: client3
echo   template:
echo     metadata:
echo       labels:
echo         app: client3
echo     spec:
echo       containers:
echo       - name: client
echo         image: log430-client:latest
echo         imagePullPolicy: Never
echo         ports:
echo         - containerPort: 80
echo ---
echo apiVersion: v1
echo kind: Service
echo metadata:
echo   name: client3
echo spec:
echo   selector:
echo     app: client3
echo   ports:
echo   - port: 80
echo     targetPort: 80
echo   type: ClusterIP
) > k8s/temp-client3.yaml

echo [3/4] Deploying client instances...
kubectl apply -f k8s/temp-client1.yaml
kubectl apply -f k8s/temp-client2.yaml
kubectl apply -f k8s/temp-client3.yaml

echo [4/4] Cleaning up temporary files...
del k8s\temp-client1.yaml
del k8s\temp-client2.yaml
del k8s\temp-client3.yaml

echo ============================================
echo Deployment complete!
echo ============================================

echo Checking pod status...
kubectl get pods

echo For port forwarding, run: scripts\port-forward-all.bat
echo For monitoring, run: scripts\port-forward-monitoring.bat

echo The application will be available at:
echo - Server API: http://localhost:3000 (after port forwarding)
echo - Client 1: http://localhost:8081 (after port forwarding)
echo - Client 2: http://localhost:8082 (after port forwarding)
echo - Client 3: http://localhost:8083 (after port forwarding)
echo ============================================ 